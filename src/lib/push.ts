import "server-only"
import { eq } from "drizzle-orm"
import webpush from "web-push"
import { db, ready } from "@/db"
import { pushSubscriptions } from "@/db/schema"
import { getSetting, setSetting } from "@/lib/auth/store"

const PUBLIC_KEY = "vapid_public_key"
const PRIVATE_KEY = "vapid_private_key"
const SUBJECT = "mailto:admin@pvdre.space"

export async function vapidKeys() {
  await ready()
  const [pub, priv] = await Promise.all([getSetting(PUBLIC_KEY), getSetting(PRIVATE_KEY)])
  if (pub && priv) return { publicKey: pub, privateKey: priv }

  const generated = webpush.generateVAPIDKeys()
  await setSetting(PUBLIC_KEY, generated.publicKey)
  await setSetting(PRIVATE_KEY, generated.privateKey)
  return generated
}

export type PushPayload = { title: string; body?: string; url?: string; tag?: string }

export async function sendPush(payload: PushPayload) {
  await ready()
  const subs = await db.select().from(pushSubscriptions)
  if (subs.length === 0) return { sent: 0, removed: 0 }

  const keys = await vapidKeys()
  webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey)

  let sent = 0
  let removed = 0

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      sent += 1
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint))
        removed += 1
      }
    }
  }

  return { sent, removed }
}
