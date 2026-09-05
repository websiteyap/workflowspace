import "server-only"
import { createHash, randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db, ready } from "@/db"
import { alertEvents, alertRules } from "@/db/schema"
import { getQuotes } from "./market"

const COOLDOWN_MS = 6 * 60 * 60 * 1000

export function cronToken() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET yok")
  return createHash("sha256").update(`cron:${secret}`).digest("hex")
}

export const ALERT_KINDS = [
  { value: "price_below", label: "Fiyat şunun altına inerse" },
  { value: "price_above", label: "Fiyat şunun üstüne çıkarsa" },
  { value: "drop_24h", label: "24 saatte şu kadar düşerse (%)" },
  { value: "rise_24h", label: "24 saatte şu kadar çıkarsa (%)" },
]

function evaluate(kind: string, threshold: number, priceUsd: number, change24h: number) {
  switch (kind) {
    case "price_below":
      return priceUsd < threshold
    case "price_above":
      return priceUsd > threshold
    case "drop_24h":
      return change24h <= -Math.abs(threshold)
    case "rise_24h":
      return change24h >= Math.abs(threshold)
    default:
      return false
  }
}

function describe(kind: string, symbol: string, threshold: number, priceUsd: number, change24h: number) {
  const price = `$${priceUsd.toLocaleString("tr-TR", { maximumFractionDigits: priceUsd < 1 ? 6 : 2 })}`
  const change = `%${change24h.toFixed(1)}`
  switch (kind) {
    case "price_below":
      return { title: `${symbol} ${price}`, body: `Belirlediğin $${threshold} eşiğinin altına indi.`, level: "warning" }
    case "price_above":
      return { title: `${symbol} ${price}`, body: `Belirlediğin $${threshold} eşiğini geçti.`, level: "info" }
    case "drop_24h":
      return { title: `${symbol} 24 saatte ${change}`, body: `Fiyat ${price}. Eşik %${threshold} düşüş.`, level: "warning" }
    default:
      return { title: `${symbol} 24 saatte ${change}`, body: `Fiyat ${price}. Eşik %${threshold} yükseliş.`, level: "info" }
  }
}

export async function runAlertCheck() {
  await ready()
  const rules = await db.select().from(alertRules).where(eq(alertRules.enabled, 1))
  if (rules.length === 0) return { checked: 0, fired: 0 }

  const quotes = await getQuotes(rules.map((r) => ({ coinId: r.coinId, symbol: r.symbol })))
  const now = Date.now()
  let fired = 0

  for (const rule of rules) {
    const quote = quotes.get(rule.coinId)
    if (!quote || quote.stale) continue

    const threshold = Number(rule.threshold)
    if (!Number.isFinite(threshold)) continue
    if (!evaluate(rule.kind, threshold, quote.priceUsd, quote.change24h)) continue

    if (rule.lastFiredAt && now - new Date(rule.lastFiredAt).getTime() < COOLDOWN_MS) continue

    const { title, body, level } = describe(rule.kind, rule.symbol, threshold, quote.priceUsd, quote.change24h)
    await db.insert(alertEvents).values({
      id: randomUUID(),
      ruleId: rule.id,
      symbol: rule.symbol,
      title,
      body: rule.note ? `${body} — ${rule.note}` : body,
      level,
      createdAt: new Date().toISOString(),
    })
    await db.update(alertRules).set({ lastFiredAt: new Date().toISOString() }).where(eq(alertRules.id, rule.id))
    fired += 1
  }

  return { checked: rules.length, fired }
}
