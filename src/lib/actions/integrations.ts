"use server"

import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/auth/guard"
import { deleteSetting, getSetting, setSetting } from "@/lib/auth/store"
import { notify, sendTelegram, telegramConfig } from "@/lib/notify"
import { audit } from "@/lib/observability"

export async function integrationSettings() {
  await requireSession()
  return telegramConfig()
}

export async function saveTelegram(token: string, chatId: string) {
  const session = await requireSession()
  const cleanToken = token.trim()
  const cleanChat = chatId.trim()

  if (!cleanToken || !cleanChat) return { error: "Bot token ve chat ID gerekli." }
  if (!/^\d+:[\w-]{20,}$/.test(cleanToken)) return { error: "Bot token formatı geçersiz." }

  await setSetting("telegram_bot_token", cleanToken)
  await setSetting("telegram_chat_id", cleanChat)
  await setSetting("telegram_enabled", "1")
  await audit("telegram_configured", "integration", { sessionId: session.id })
  revalidatePath("/ayarlar")

  const test = await sendTelegram({
    title: "Source bağlandı",
    body: "Bildirimler bu sohbete gelecek.",
    url: "/",
  })
  if (!test.sent) return { error: `Kaydedildi ama mesaj gönderilemedi: ${test.error}` }
  return { ok: true }
}

export async function toggleTelegram(enabled: boolean) {
  await requireSession()
  await setSetting("telegram_enabled", enabled ? "1" : "0")
  revalidatePath("/ayarlar")
  return { ok: true }
}

export async function removeTelegram() {
  const session = await requireSession()
  await deleteSetting("telegram_bot_token")
  await deleteSetting("telegram_chat_id")
  await deleteSetting("telegram_enabled")
  await audit("telegram_removed", "integration", { sessionId: session.id })
  revalidatePath("/ayarlar")
  return { ok: true }
}

export async function sendTestNotification() {
  await requireSession()
  return notify({
    title: "Source test bildirimi",
    body: "Bu mesaj hem tarayıcı bildirimi hem Telegram olarak gönderildi.",
    url: "/",
  })
}

export async function webhookToken() {
  await requireSession()
  const existing = await getSetting("webhook_token")
  if (existing) return existing
  const { randomBytes } = await import("node:crypto")
  const token = randomBytes(24).toString("base64url")
  await setSetting("webhook_token", token)
  return token
}

export async function rotateWebhookToken() {
  const session = await requireSession()
  const { randomBytes } = await import("node:crypto")
  const token = randomBytes(24).toString("base64url")
  await setSetting("webhook_token", token)
  await audit("webhook_token_rotated", "integration", { sessionId: session.id })
  revalidatePath("/ayarlar")
  return token
}
