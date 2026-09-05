import "server-only"
import { createHash } from "node:crypto"

export function cronToken() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET yok")
  return createHash("sha256").update(`cron:${secret}`).digest("hex")
}

export const ALERT_KINDS = [
  { value: "price_below", label: "Fiyat altına inerse ($)" },
  { value: "price_above", label: "Fiyat üstüne çıkarsa ($)" },
  { value: "drop_24h", label: "24 saatte düşerse (%)" },
  { value: "rise_24h", label: "24 saatte çıkarsa (%)" },
  { value: "sma50_cross_down", label: "50 günlük ortalamanın altına inerse" },
  { value: "sma50_cross_up", label: "50 günlük ortalamayı geçerse" },
  { value: "rsi_below", label: "RSI altına inerse" },
  { value: "rsi_above", label: "RSI üstüne çıkarsa" },
]
