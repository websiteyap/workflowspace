import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, isNull, lt, sql } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { db, ready } from "@/db"
import { sessions, settings } from "@/db/schema"
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "./session"

export async function getSetting(key: string) {
  await ready()
  const [row] = await db.select().from(settings).where(eq(settings.key, key))
  return row?.value ?? null
}

export async function setSetting(key: string, value: string) {
  await ready()
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}

export async function deleteSetting(key: string) {
  await ready()
  await db.delete(settings).where(eq(settings.key, key))
}

export async function createSession(subject: string) {
  await ready()
  const h = await headers()
  const id = randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE * 1000)

  await db.insert(sessions).values({
    id,
    subject,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: now.toISOString(),
    userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || null,
  })

  await db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString()))
  return id
}

export async function activeSession() {
  await ready()
  const store = await cookies()
  const claims = await verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (!claims) return null

  const [row] = await db.select().from(sessions).where(eq(sessions.id, claims.sessionId))
  if (!row || row.revokedAt || row.expiresAt < new Date().toISOString()) return null
  return row
}

export async function touchSession(id: string) {
  await ready()
  await db.update(sessions).set({ lastSeenAt: new Date().toISOString() }).where(eq(sessions.id, id))
}

export async function listSessions() {
  await ready()
  const now = new Date().toISOString()
  return db
    .select()
    .from(sessions)
    .where(and(isNull(sessions.revokedAt), sql`${sessions.expiresAt} > ${now}`))
    .orderBy(sql`${sessions.lastSeenAt} DESC`)
}

export async function revokeSession(id: string) {
  await ready()
  await db.update(sessions).set({ revokedAt: new Date().toISOString() }).where(eq(sessions.id, id))
}

export async function revokeAllExcept(id: string) {
  await ready()
  await db
    .update(sessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(isNull(sessions.revokedAt), sql`${sessions.id} != ${id}`))
}
