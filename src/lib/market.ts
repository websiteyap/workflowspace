import "server-only"
import { inArray } from "drizzle-orm"
import { db, ready } from "@/db"
import { priceCache } from "@/db/schema"

const CACHE_TTL_MS = 5 * 60 * 1000
const API = "https://api.coingecko.com/api/v3"

export type Quote = {
  coinId: string
  symbol: string
  priceUsd: number
  priceTry: number
  change24h: number
  updatedAt: string
  stale: boolean
}

export type CoinSearchResult = { id: string; symbol: string; name: string }

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (query.trim().length < 2) return []
  try {
    const res = await fetch(`${API}/search?query=${encodeURIComponent(query.trim())}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { coins?: { id: string; symbol: string; name: string }[] }
    return (data.coins ?? []).slice(0, 12).map((c) => ({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name }))
  } catch {
    return []
  }
}

async function fetchQuotes(coinIds: string[]) {
  const res = await fetch(
    `${API}/simple/price?ids=${coinIds.join(",")}&vs_currencies=usd,try&include_24hr_change=true`,
    { signal: AbortSignal.timeout(9000) },
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  return (await res.json()) as Record<
    string,
    { usd?: number; try?: number; usd_24h_change?: number }
  >
}

export async function getQuotes(coins: { coinId: string; symbol: string }[]): Promise<Map<string, Quote>> {
  await ready()
  const result = new Map<string, Quote>()
  const unique = [...new Map(coins.map((c) => [c.coinId, c])).values()].filter((c) => c.coinId)
  if (unique.length === 0) return result

  const ids = unique.map((c) => c.coinId)
  const cached = await db.select().from(priceCache).where(inArray(priceCache.coinId, ids))
  const now = Date.now()

  const fresh = new Map(
    cached
      .filter((row) => now - new Date(row.updatedAt).getTime() < CACHE_TTL_MS)
      .map((row) => [row.coinId, row]),
  )

  const missing = unique.filter((c) => !fresh.has(c.coinId))

  if (missing.length > 0) {
    try {
      const data = await fetchQuotes(missing.map((c) => c.coinId))
      const updatedAt = new Date().toISOString()
      for (const coin of missing) {
        const entry = data[coin.coinId]
        if (!entry?.usd) continue
        const row = {
          coinId: coin.coinId,
          symbol: coin.symbol,
          priceUsd: String(entry.usd),
          priceTry: String(entry.try ?? 0),
          change24h: String(entry.usd_24h_change ?? 0),
          updatedAt,
        }
        await db.insert(priceCache).values(row).onConflictDoUpdate({ target: priceCache.coinId, set: row })
        result.set(coin.coinId, {
          coinId: coin.coinId,
          symbol: coin.symbol,
          priceUsd: entry.usd,
          priceTry: entry.try ?? 0,
          change24h: entry.usd_24h_change ?? 0,
          updatedAt,
          stale: false,
        })
      }
    } catch {
      /* servis erisilemezse onbellekteki eski degerler kullanilir */
    }
  }

  for (const row of cached) {
    if (result.has(row.coinId)) continue
    result.set(row.coinId, {
      coinId: row.coinId,
      symbol: row.symbol,
      priceUsd: Number(row.priceUsd),
      priceTry: Number(row.priceTry),
      change24h: Number(row.change24h ?? 0),
      updatedAt: row.updatedAt,
      stale: now - new Date(row.updatedAt).getTime() >= CACHE_TTL_MS,
    })
  }

  return result
}
