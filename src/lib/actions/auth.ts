"use server"

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { eq } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { db, ready } from "@/db"
import { loginAttempts } from "@/db/schema"
import { audit } from "@/lib/observability"
import { verifyPassword } from "@/lib/auth/password"
import { open, seal } from "@/lib/auth/secret-box"
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/auth/session"
import {
  activeSession,
  createSession,
  deleteSetting,
  getSetting,
  revokeAllExcept,
  revokeSession,
  setSetting,
} from "@/lib/auth/store"
import { generateSecret, otpauthUrl, verifyCode } from "@/lib/auth/totp"
import type { ActionState } from "./helpers"

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

const TOTP_SECRET = "totp_secret"
const TOTP_PENDING = "totp_pending"
const RECOVERY_CODES = "recovery_codes"

async function rateLimit(key: string) {
  await ready()
  const now = Date.now()
  const [entry] = await db.select().from(loginAttempts).where(eq(loginAttempts.key, key))

  if (!entry || new Date(entry.resetAt).getTime() < now) {
    const row = { key, count: 1, resetAt: new Date(now + WINDOW_MS).toISOString() }
    await db.insert(loginAttempts).values(row).onConflictDoUpdate({ target: loginAttempts.key, set: row })
    return { allowed: true, retryInMinutes: 0 }
  }

  const count = entry.count + 1
  await db.update(loginAttempts).set({ count }).where(eq(loginAttempts.key, key))

  if (count > MAX_ATTEMPTS) {
    return { allowed: false, retryInMinutes: Math.ceil((new Date(entry.resetAt).getTime() - now) / 60000) }
  }
  return { allowed: true, retryInMinutes: 0 }
}

async function clearLimit(key: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key))
}

async function clientKey() {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "local"
}

function safePath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  return value
}

const hashCode = (code: string) => createHash("sha256").update(code.trim().toUpperCase()).digest("hex")

export async function twoFactorEnabled() {
  return (await getSetting(TOTP_SECRET)) !== null
}

async function consumeRecoveryCode(code: string) {
  const stored = await getSetting(RECOVERY_CODES)
  if (!stored) return false

  const hashes = JSON.parse(stored) as string[]
  const target = hashCode(code)
  const index = hashes.findIndex((h) => {
    const a = Buffer.from(h)
    const b = Buffer.from(target)
    return a.length === b.length && timingSafeEqual(a, b)
  })
  if (index === -1) return false

  hashes.splice(index, 1)
  await setSetting(RECOVERY_CODES, JSON.stringify(hashes))
  return true
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const code = String(formData.get("code") ?? "").trim()
  const next = safePath(String(formData.get("next") ?? "/"))

  if (!username || !password) return { error: "Kullanıcı adı ve parola gerekli." }

  const expectedUser = process.env.AUTH_USERNAME
  const expectedHash = process.env.AUTH_PASSWORD_HASH
  if (!expectedUser || !expectedHash || !process.env.AUTH_SECRET) {
    return { error: "Sunucu kimlik doğrulama için yapılandırılmamış." }
  }

  const key = await clientKey()
  const limit = await rateLimit(key)
  if (!limit.allowed) {
    return { error: `Çok fazla başarısız deneme. ${limit.retryInMinutes} dakika sonra tekrar deneyin.` }
  }

  const passwordOk = await verifyPassword(password, expectedHash)
  const userOk = username.toLocaleLowerCase("tr-TR") === expectedUser.toLocaleLowerCase("tr-TR")
  if (!passwordOk || !userOk) {
    await audit("login_failed", "auth", { summary: username.slice(0, 60) })
    return { error: "Kullanıcı adı veya parola hatalı." }
  }

  const sealedSecret = await getSetting(TOTP_SECRET)
  if (sealedSecret) {
    if (!code) return { stage: "need-code" }
    const secret = open(sealedSecret)
    const ok = verifyCode(secret, code) || (await consumeRecoveryCode(code))
    if (!ok) {
      await audit("login_2fa_failed", "auth")
      return { error: "Doğrulama kodu hatalı.", stage: "need-code" }
    }
  }

  await clearLimit(key)

  const sessionId = await createSession(expectedUser)
  await audit("login", "auth", { sessionId })
  const token = await createSessionToken(expectedUser, sessionId)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })

  redirect(next)
}

export async function logout() {
  const session = await activeSession()
  if (session) {
    await audit("logout", "auth", { sessionId: session.id })
    await revokeSession(session.id)
  }
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect("/giris")
}

export async function beginTwoFactorSetup() {
  const session = await activeSession()
  if (!session) return { error: "Oturum geçersiz." }

  const secret = generateSecret()
  await setSetting(TOTP_PENDING, seal(secret))
  return { secret, url: otpauthUrl(secret, session.subject) }
}

export async function confirmTwoFactorSetup(code: string) {
  const session = await activeSession()
  if (!session) return { error: "Oturum geçersiz." }

  const pending = await getSetting(TOTP_PENDING)
  if (!pending) return { error: "Önce kurulumu başlatın." }

  const secret = open(pending)
  if (!verifyCode(secret, code)) return { error: "Kod doğrulanamadı. Tekrar deneyin." }

  const codes = Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase())
  await setSetting(TOTP_SECRET, seal(secret))
  await setSetting(RECOVERY_CODES, JSON.stringify(codes.map(hashCode)))
  await deleteSetting(TOTP_PENDING)
  await audit("2fa_enabled", "auth", { sessionId: session.id })

  return { ok: true, recoveryCodes: codes }
}

export async function disableTwoFactor(password: string) {
  const session = await activeSession()
  if (!session) return { error: "Oturum geçersiz." }

  if (!(await verifyPassword(password, process.env.AUTH_PASSWORD_HASH))) {
    return { error: "Parola hatalı." }
  }

  await deleteSetting(TOTP_SECRET)
  await deleteSetting(TOTP_PENDING)
  await deleteSetting(RECOVERY_CODES)
  await audit("2fa_disabled", "auth", { sessionId: session.id })
  return { ok: true }
}

export async function endSession(id: string) {
  const session = await activeSession()
  if (!session) return
  if (id === session.id) return
  await audit("session_revoked", "auth", { entityId: id, sessionId: session.id })
  await revokeSession(id)
}

export async function endOtherSessions() {
  const session = await activeSession()
  if (!session) return
  await audit("sessions_revoked_all", "auth", { sessionId: session.id })
  await revokeAllExcept(session.id)
}
