import "server-only"
import { eq } from "drizzle-orm"
import { db, ready } from "@/db"
import { fxRates } from "@/db/schema"
import { BASE_CURRENCY, CURRENCIES, type RateMap, rateFor, todayISO } from "./format"

const FALLBACK: RateMap = { TRY: 1, USD: 42, EUR: 46, GBP: 54 }

const memory = new Map<string, { rates: RateMap; at: number }>()
const MEMORY_TTL = 10 * 60 * 1000

function normalize(input: Record<string, number>): RateMap {
  const rates: RateMap = { TRY: 1 }
  for (const currency of CURRENCIES) {
    if (currency === BASE_CURRENCY) continue
    const perBase = input[currency]
    if (typeof perBase === "number" && perBase > 0) rates[currency] = 1 / perBase
  }
  return rates
}

async function fetchFrankfurter(date: string): Promise<{ rates: RateMap; source: string } | null> {
  const path = date === todayISO() ? "latest" : date
  const symbols = CURRENCIES.filter((c) => c !== BASE_CURRENCY).join(",")
  const res = await fetch(`https://api.frankfurter.app/${path}?base=${BASE_CURRENCY}&symbols=${symbols}`, {
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { rates?: Record<string, number> }
  if (!data.rates) return null
  const rates = normalize(data.rates)
  return Object.keys(rates).length > 1 ? { rates, source: "frankfurter" } : null
}

async function fetchErApi(): Promise<{ rates: RateMap; source: string } | null> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`, {
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { rates?: Record<string, number> }
  if (!data.rates) return null
  const rates = normalize(data.rates)
  return Object.keys(rates).length > 1 ? { rates, source: "er-api" } : null
}

async function download(date: string) {
  const attempts = [() => fetchFrankfurter(date), () => fetchErApi()]
  for (const attempt of attempts) {
    try {
      const result = await attempt()
      if (result) return result
    } catch {}
  }
  return null
}

export async function getRates(date?: string): Promise<RateMap> {
  const day = (date ?? todayISO()).slice(0, 10)

  const cached = memory.get(day)
  if (cached && Date.now() - cached.at < MEMORY_TTL) return cached.rates

  await ready()
  const [row] = await db.select().from(fxRates).where(eq(fxRates.date, day))
  if (row) {
    const rates = JSON.parse(row.rates) as RateMap
    memory.set(day, { rates, at: Date.now() })
    return rates
  }

  const fresh = await download(day)
  if (!fresh) {
    const [latest] = await db.select().from(fxRates).orderBy(fxRates.date).limit(1)
    const rates = latest ? (JSON.parse(latest.rates) as RateMap) : FALLBACK
    memory.set(day, { rates, at: Date.now() })
    return rates
  }

  await db
    .insert(fxRates)
    .values({
      date: day,
      base: BASE_CURRENCY,
      rates: JSON.stringify(fresh.rates),
      source: fresh.source,
      fetchedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()

  memory.set(day, { rates: fresh.rates, at: Date.now() })
  return fresh.rates
}

export async function convertToBase(amountMinor: number, currency: string, date?: string) {
  if (currency === BASE_CURRENCY) return { baseAmount: amountMinor, fxRate: "1" }
  const rates = await getRates(date)
  const rate = rateFor(currency, rates)
  return { baseAmount: Math.round(amountMinor * rate), fxRate: String(rate) }
}
