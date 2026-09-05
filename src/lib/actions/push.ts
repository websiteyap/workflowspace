"use server"

import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { db } from "@/db"
import { pushSubscriptions } from "@/db/schema"
import { requireSession } from "@/lib/auth/guard"
import { sendPush, vapidKeys } from "@/lib/push"

export async function pushPublicKey() {
  await requireSession()
  return (await vapidKeys()).publicKey
}

export async function subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await requireSession()
  if (!subscription?.endpoint || !subscription.keys?.p256dh) return { error: "Geçersiz abonelik." }

  const h = await headers()
  const row = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    createdAt: new Date().toISOString(),
  }
  await db.insert(pushSubscriptions).values(row).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: row.p256dh, auth: row.auth, userAgent: row.userAgent },
  })
  return { ok: true }
}

export async function unsubscribePush(endpoint: string) {
  await requireSession()
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  return { ok: true }
}

export async function pushSubscriptionCount() {
  await requireSession()
  const rows = await db.select({ endpoint: pushSubscriptions.endpoint }).from(pushSubscriptions)
  return rows.length
}

export async function sendTestPush() {
  await requireSession()
  return sendPush({
    title: "Source test bildirimi",
    body: "Uygulama kapalıyken de bu şekilde ulaşır.",
    url: "/",
  })
}
