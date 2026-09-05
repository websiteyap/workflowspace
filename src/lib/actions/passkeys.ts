"use server"

import { desc, eq } from "drizzle-orm"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server"
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server"
import { cookies, headers } from "next/headers"
import { db, ready } from "@/db"
import { passkeys } from "@/db/schema"
import { currentUsername } from "@/lib/auth/credentials"
import { requireSession } from "@/lib/auth/guard"
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/auth/session"
import { createSession, deleteSetting, getSetting, setSetting } from "@/lib/auth/store"
import { audit } from "@/lib/observability"

const REG_CHALLENGE = "passkey_reg_challenge"
const AUTH_CHALLENGE = "passkey_auth_challenge"
const USER_HANDLE = "source-user"

async function origin() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return { rpID: host.split(":")[0], expectedOrigin: `${proto}://${host}` }
}

export async function listPasskeys() {
  await requireSession()
  return db.select().from(passkeys).orderBy(desc(passkeys.createdAt))
}

export async function hasPasskeys() {
  await ready()
  const rows = await db.select({ id: passkeys.id }).from(passkeys).limit(1)
  return rows.length > 0
}

export async function beginPasskeyRegistration() {
  await requireSession()
  const { rpID } = await origin()
  const username = (await currentUsername()) ?? "kullanici"
  const existing = await db.select().from(passkeys)

  const options = await generateRegistrationOptions({
    rpName: "Source",
    rpID,
    userName: username,
    userID: new TextEncoder().encode(USER_HANDLE),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  })

  await setSetting(REG_CHALLENGE, options.challenge)
  return options
}

export async function finishPasskeyRegistration(response: RegistrationResponseJSON, label: string) {
  const session = await requireSession()
  const challenge = await getSetting(REG_CHALLENGE)
  if (!challenge) return { error: "Kurulum oturumu bulunamadı, tekrar deneyin." }

  const { rpID, expectedOrigin } = await origin()

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return { error: "Doğrulama başarısız." }
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    await db.insert(passkeys).values({
      id: credential.id,
      label: label.trim() || "Cihaz",
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ? JSON.stringify(credential.transports) : null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp ? 1 : 0,
      createdAt: new Date().toISOString(),
    })

    await deleteSetting(REG_CHALLENGE)
    await audit("passkey_added", "auth", { sessionId: session.id, summary: label })
    return { ok: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Doğrulama başarısız." }
  }
}

export async function beginPasskeyLogin() {
  await ready()
  const rows = await db.select().from(passkeys)
  if (rows.length === 0) return { error: "Kayıtlı passkey yok." }

  const { rpID } = await origin()
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: rows.map((p) => ({
      id: p.id,
      transports: p.transports ? (JSON.parse(p.transports) as ("usb" | "ble" | "nfc" | "internal" | "hybrid")[]) : undefined,
    })),
    userVerification: "preferred",
  })

  await setSetting(AUTH_CHALLENGE, options.challenge)
  return { options }
}

export async function finishPasskeyLogin(response: AuthenticationResponseJSON) {
  await ready()
  const challenge = await getSetting(AUTH_CHALLENGE)
  if (!challenge) return { error: "Giriş oturumu bulunamadı, tekrar deneyin." }

  const [stored] = await db.select().from(passkeys).where(eq(passkeys.id, response.id))
  if (!stored) return { error: "Bu passkey tanınmıyor." }

  const { rpID, expectedOrigin } = await origin()

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
        counter: stored.counter,
        transports: stored.transports ? (JSON.parse(stored.transports) as never) : undefined,
      },
      requireUserVerification: false,
    })

    if (!verification.verified) return { error: "Doğrulama başarısız." }

    await db
      .update(passkeys)
      .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date().toISOString() })
      .where(eq(passkeys.id, stored.id))
    await deleteSetting(AUTH_CHALLENGE)

    const username = (await currentUsername()) ?? "kullanici"
    const sessionId = await createSession(username)
    const token = await createSessionToken(username, sessionId)

    const store = await cookies()
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })

    await audit("login_passkey", "auth", { sessionId, summary: stored.label })
    return { ok: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Doğrulama başarısız." }
  }
}

export async function deletePasskey(id: string) {
  const session = await requireSession()
  await db.delete(passkeys).where(eq(passkeys.id, id))
  await audit("passkey_removed", "auth", { sessionId: session.id, entityId: id })
}
