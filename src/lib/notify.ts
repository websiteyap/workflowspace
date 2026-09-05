import "server-only"
import { getSetting } from "@/lib/auth/store"
import { type PushPayload, sendPush } from "./push"

const TG_TOKEN = "telegram_bot_token"
const TG_CHAT = "telegram_chat_id"
const TG_ENABLED = "telegram_enabled"

export async function telegramConfig() {
  const [token, chatId, enabled] = await Promise.all([
    getSetting(TG_TOKEN),
    getSetting(TG_CHAT),
    getSetting(TG_ENABLED),
  ])
  return {
    configured: Boolean(token && chatId),
    enabled: enabled !== "0" && Boolean(token && chatId),
    chatId,
    tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : null,
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function sendTelegram(payload: PushPayload) {
  const [token, chatId, enabled] = await Promise.all([
    getSetting(TG_TOKEN),
    getSetting(TG_CHAT),
    getSetting(TG_ENABLED),
  ])
  if (!token || !chatId || enabled === "0") return { sent: false, error: "yapılandırılmamış" }

  const base = process.env.APP_URL ?? "https://workflow.pvdre.space"
  const lines = [`<b>${escapeHtml(payload.title)}</b>`]
  if (payload.body) lines.push(escapeHtml(payload.body))
  if (payload.url) lines.push(`<a href="${base}${payload.url}">Panelde aç</a>`)

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))) as { description?: string }
      return { sent: false, error: detail.description ?? `HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "bilinmeyen hata" }
  }
}

export async function notify(payload: PushPayload) {
  const [push, telegram] = await Promise.all([sendPush(payload), sendTelegram(payload)])
  return { push: push.sent, telegram: telegram.sent }
}
