import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "source_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14

let cachedSecret: Uint8Array | null = null

function secret() {
  if (cachedSecret) return cachedSecret
  const raw = process.env.AUTH_SECRET
  if (!raw || raw.length < 32) {
    throw new Error("AUTH_SECRET tanımlı değil veya 32 karakterden kısa.")
  }
  cachedSecret = new TextEncoder().encode(raw)
  return cachedSecret
}

export async function createSessionToken(subject: string, sessionId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret())
}

export type SessionClaims = { subject: string; sessionId: string }

export async function verifySessionToken(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] })
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null
    return { subject: payload.sub, sessionId: payload.jti }
  } catch {
    return null
  }
}
