"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { verifyPassword } from "@/lib/auth/password"
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/auth/session"
import type { ActionState } from "./helpers"

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

const attempts = new Map<string, { count: number; resetAt: number }>()

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

function clearLimit(key: string) {
  attempts.delete(key)
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

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
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

  if (!passwordOk || !userOk) {
    return { error: "Kullanıcı adı veya parola hatalı." }
  }

  clearLimit(key)

  const token = await createSessionToken(expectedUser)
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
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect("/giris")
}
