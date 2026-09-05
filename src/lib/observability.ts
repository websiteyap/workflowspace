import "server-only"
import { randomUUID } from "node:crypto"
import { desc, lt } from "drizzle-orm"
import { headers } from "next/headers"
import { db, ready } from "@/db"
import { auditLog, errorLog } from "@/db/schema"

const AUDIT_RETENTION_DAYS = 180
const ERROR_RETENTION_DAYS = 60

async function clientIp() {
  try {
    const h = await headers()
    return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || null
  } catch {
    return null
  }
}

export async function audit(
  action: string,
  entity: string,
  options?: { entityId?: string | null; summary?: string | null; sessionId?: string | null },
) {
  try {
    await ready()
    await db.insert(auditLog).values({
      id: randomUUID(),
      action,
      entity,
      entityId: options?.entityId ?? null,
      summary: options?.summary?.slice(0, 300) ?? null,
      sessionId: options?.sessionId ?? null,
      ip: await clientIp(),
      createdAt: new Date().toISOString(),
    })
  } catch {
    /* denetim kaydi asla ana islemi bozmamali */
  }
}

export async function captureError(error: unknown, context?: string) {
  try {
    await ready()
    const message = error instanceof Error ? error.message : String(error)
    await db.insert(errorLog).values({
      id: randomUUID(),
      message: message.slice(0, 500),
      stack: error instanceof Error ? (error.stack?.slice(0, 4000) ?? null) : null,
      context: context?.slice(0, 200) ?? null,
      level: "error",
      createdAt: new Date().toISOString(),
    })
  } catch {
    /* yutulur */
  }

  const dsn = process.env.SENTRY_DSN
  if (dsn) void forwardToSentry(dsn, error, context)
}

async function forwardToSentry(dsn: string, error: unknown, context?: string) {
  try {
    const parsed = new URL(dsn)
    const projectId = parsed.pathname.replace(/^\//, "")
    const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/`
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${parsed.username}`,
      },
      body: JSON.stringify({
        message: error instanceof Error ? error.message : String(error),
        level: "error",
        platform: "node",
        extra: { context, stack: error instanceof Error ? error.stack : undefined },
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* yutulur */
  }
}

export async function recentAudit(limit = 100) {
  await ready()
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit)
}

export async function recentErrors(limit = 50) {
  await ready()
  return db.select().from(errorLog).orderBy(desc(errorLog.createdAt)).limit(limit)
}

export async function pruneLogs() {
  await ready()
  const auditCutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 86_400_000).toISOString()
  const errorCutoff = new Date(Date.now() - ERROR_RETENTION_DAYS * 86_400_000).toISOString()
  await db.delete(auditLog).where(lt(auditLog.createdAt, auditCutoff))
  await db.delete(errorLog).where(lt(errorLog.createdAt, errorCutoff))
}
