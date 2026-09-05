"use server"

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
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
const attempts = new Map<string, { count: number; resetAt: number }>()

const TOTP_SECRET = "totp_secret"
const TOTP_PENDING = "totp_pending"
const RECOVERY_CODES = "recovery_codes"

function rateLimit(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryInMinutes: 0 }
  }
  entry.count += 1
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryInMinutes: Math.ceil((entry.resetAt - now) / 60000) }
  }
  return { allowed: true, retryInMinutes: 0 }
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
  const limit = rateLimit(key)
  if (!limit.allowed) {
    return { error: `Çok fazla başarısız deneme. ${limit.retryInMinutes} dakika sonra tekrar deneyin.` }
  }

  const passwordOk = await verifyPassword(password, expectedHash)
  const userOk = username.toLocaleLowerCase("tr-TR") === expectedUser.toLocaleLowerCase("tr-TR")
  if (!passwordOk || !userOk) return { error: "Kullanıcı adı veya parola hatalı." }

  const sealedSecret = await getSetting(TOTP_SECRET)
  if (sealedSecret) {
    if (!code) return { stage: "need-code" }
    const secret = open(sealedSecret)
    const ok = verifyCode(secret, code) || (await consumeRecoveryCode(code))
    if (!ok) return { error: "Doğrulama kodu hatalı.", stage: "need-code" }
  }

  attempts.delete(key)

  const sessionId = await createSession(expectedUser)
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
  if (session) await revokeSession(session.id)
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
  return { ok: true }
}

export async function endSession(id: string) {
  const session = await activeSession()
  if (!session) return
  if (id === session.id) return
  await revokeSession(id)
}

export async function endOtherSessions() {
  const session = await activeSession()
  if (!session) return
  await revokeAllExcept(session.id)
}
