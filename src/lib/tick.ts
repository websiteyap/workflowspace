import "server-only"
import { randomUUID } from "node:crypto"
import { and, asc, eq, gte, isNotNull, isNull, lte, ne, sql } from "drizzle-orm"
import { db, ready } from "@/db"
import {
  alertEvents,
  alertRules,
  holdings,
  portfolioSnapshots,
  priceHistory,
  projects,
  tasks,
} from "@/db/schema"
import { rateFor, todayISO } from "./format"
import { getRates } from "./fx"
import { getQuotes } from "./market"
import { pruneLogs } from "./observability"
import { notify } from "./notify"

const COOLDOWN_MS = 6 * 60 * 60 * 1000
const HISTORY_TARGET = 220

export const ALERT_KIND_VALUES = [
  "price_below",
  "price_above",
  "drop_24h",
  "rise_24h",
  "sma50_cross_down",
  "sma50_cross_up",
  "rsi_below",
  "rsi_above",
] as const

function sma(values: number[], period: number) {
  if (values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return null
  let gains = 0
  let losses = 0
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

async function trackedCoins() {
  await ready()
  const [fromHoldings, fromRules] = await Promise.all([
    db.select({ coinId: holdings.coinId, symbol: holdings.symbol }).from(holdings).where(isNotNull(holdings.coinId)),
    db.select({ coinId: alertRules.coinId, symbol: alertRules.symbol }).from(alertRules),
  ])
  const map = new Map<string, string>()
  for (const row of [...fromHoldings, ...fromRules]) {
    if (row.coinId) map.set(row.coinId, row.symbol)
  }
  return [...map.entries()].map(([coinId, symbol]) => ({ coinId, symbol }))
}

async function backfillHistory(coinId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(priceHistory)
    .where(eq(priceHistory.coinId, coinId))
  if (Number(row?.n ?? 0) >= HISTORY_TARGET) return 0

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`,
      { signal: AbortSignal.timeout(15000) },
    )
    if (!res.ok) return 0
    const data = (await res.json()) as { prices?: [number, number][] }
    if (!data.prices?.length) return 0

    const seen = new Set(
      (await db.select({ date: priceHistory.date }).from(priceHistory).where(eq(priceHistory.coinId, coinId))).map(
        (r) => r.date,
      ),
    )

    let added = 0
    for (const [ms, price] of data.prices) {
      const date = new Date(ms).toISOString().slice(0, 10)
      if (seen.has(date)) continue
      seen.add(date)
      await db.insert(priceHistory).values({ id: randomUUID(), coinId, date, priceUsd: String(price) })
      added += 1
    }
    return added
  } catch {
    return 0
  }
}

async function seriesFor(coinId: string) {
  const rows = await db
    .select({ priceUsd: priceHistory.priceUsd })
    .from(priceHistory)
    .where(eq(priceHistory.coinId, coinId))
    .orderBy(asc(priceHistory.date))
  return rows.map((r) => Number(r.priceUsd)).filter((n) => Number.isFinite(n))
}

function evaluate(
  kind: string,
  threshold: number,
  ctx: { price: number; change24h: number; sma50: number | null; rsi14: number | null; prevPrice: number | null },
) {
  switch (kind) {
    case "price_below":
      return ctx.price < threshold
    case "price_above":
      return ctx.price > threshold
    case "drop_24h":
      return ctx.change24h <= -Math.abs(threshold)
    case "rise_24h":
      return ctx.change24h >= Math.abs(threshold)
    case "sma50_cross_down":
      return ctx.sma50 !== null && ctx.prevPrice !== null && ctx.prevPrice >= ctx.sma50 && ctx.price < ctx.sma50
    case "sma50_cross_up":
      return ctx.sma50 !== null && ctx.prevPrice !== null && ctx.prevPrice <= ctx.sma50 && ctx.price > ctx.sma50
    case "rsi_below":
      return ctx.rsi14 !== null && ctx.rsi14 < threshold
    case "rsi_above":
      return ctx.rsi14 !== null && ctx.rsi14 > threshold
    default:
      return false
  }
}

function describe(
  kind: string,
  symbol: string,
  threshold: number,
  ctx: { price: number; change24h: number; sma50: number | null; rsi14: number | null },
) {
  const price = `$${ctx.price.toLocaleString("tr-TR", { maximumFractionDigits: ctx.price < 1 ? 6 : 2 })}`
  switch (kind) {
    case "price_below":
      return { title: `${symbol} ${price}`, body: `$${threshold} eşiğinin altına indi.`, level: "warning" }
    case "price_above":
      return { title: `${symbol} ${price}`, body: `$${threshold} eşiğini geçti.`, level: "info" }
    case "drop_24h":
      return {
        title: `${symbol} 24 saatte %${ctx.change24h.toFixed(1)}`,
        body: `Fiyat ${price}. Eşik %${threshold} düşüş.`,
        level: "warning",
      }
    case "rise_24h":
      return {
        title: `${symbol} 24 saatte %${ctx.change24h.toFixed(1)}`,
        body: `Fiyat ${price}. Eşik %${threshold} yükseliş.`,
        level: "info",
      }
    case "sma50_cross_down":
      return {
        title: `${symbol} 50 günlük ortalamanın altına indi`,
        body: `Fiyat ${price}, 50 günlük ortalama $${ctx.sma50?.toFixed(2)}.`,
        level: "warning",
      }
    case "sma50_cross_up":
      return {
        title: `${symbol} 50 günlük ortalamayı geçti`,
        body: `Fiyat ${price}, 50 günlük ortalama $${ctx.sma50?.toFixed(2)}.`,
        level: "info",
      }
    case "rsi_below":
      return {
        title: `${symbol} RSI ${ctx.rsi14?.toFixed(0)}`,
        body: `RSI ${threshold} altına indi — aşırı satım bölgesi. Fiyat ${price}.`,
        level: "info",
      }
    default:
      return {
        title: `${symbol} RSI ${ctx.rsi14?.toFixed(0)}`,
        body: `RSI ${threshold} üstüne çıktı — aşırı alım bölgesi. Fiyat ${price}.`,
        level: "warning",
      }
  }
}

async function runAlerts() {
  const rules = await db.select().from(alertRules).where(eq(alertRules.enabled, 1))
  if (rules.length === 0) return { checked: 0, fired: 0 }

  const quotes = await getQuotes(rules.map((r) => ({ coinId: r.coinId, symbol: r.symbol })))
  const now = Date.now()
  let fired = 0

  const seriesCache = new Map<string, number[]>()

  for (const rule of rules) {
    const quote = quotes.get(rule.coinId)
    if (!quote || quote.stale) continue

    const threshold = Number(rule.threshold)
    if (!Number.isFinite(threshold)) continue

    if (!seriesCache.has(rule.coinId)) seriesCache.set(rule.coinId, await seriesFor(rule.coinId))
    const history = seriesCache.get(rule.coinId) ?? []

    const ctx = {
      price: quote.priceUsd,
      change24h: quote.change24h,
      sma50: sma(history, 50),
      rsi14: rsi([...history, quote.priceUsd]),
      prevPrice: history.length > 0 ? history[history.length - 1] : null,
    }

    if (!evaluate(rule.kind, threshold, ctx)) continue
    if (rule.lastFiredAt && now - new Date(rule.lastFiredAt).getTime() < COOLDOWN_MS) continue

    const { title, body, level } = describe(rule.kind, rule.symbol, threshold, ctx)
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
    await notify({ title, body, url: "/yatirim", tag: `alert-${rule.id}` })
    fired += 1
  }

  return { checked: rules.length, fired }
}

async function runTaskReminders() {
  const now = new Date()
  const horizon = new Date(now.getTime() + 60_000).toISOString()
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString()

  const due = await db
    .select({ id: tasks.id, title: tasks.title, remindAt: tasks.remindAt })
    .from(tasks)
    .where(
      and(
        isNotNull(tasks.remindAt),
        isNull(tasks.reminderFiredAt),
        ne(tasks.status, "done"),
        lte(tasks.remindAt, horizon),
        gte(tasks.remindAt, since),
      ),
    )
    .limit(20)

  for (const task of due) {
    await notify({ title: "Hatırlatıcı", body: task.title, url: "/gorevler", tag: `task-${task.id}` })
    await db.update(tasks).set({ reminderFiredAt: now.toISOString() }).where(eq(tasks.id, task.id))
  }
  return due.length
}

async function runPaymentReminders() {
  const today = todayISO()
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.status, "active"), isNotNull(projects.nextPaymentDate)))

  let sent = 0
  for (const project of rows) {
    const days = project.reminderDaysBefore
    if (!days || !project.nextPaymentDate) continue
    if (project.reminderSentFor === project.nextPaymentDate) continue

    const diff = Math.round(
      (new Date(`${project.nextPaymentDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
    )
    if (diff > days) continue

    await notify({
      title: "Ödeme yaklaşıyor",
      body: `${project.name}${project.clientName ? ` · ${project.clientName}` : ""} — ${
        diff <= 0 ? "vadesi geldi" : `${diff} gün kaldı`
      }`,
      url: `/projeler/${project.id}`,
      tag: `payment-${project.id}`,
    })
    await db
      .update(projects)
      .set({ reminderSentFor: project.nextPaymentDate })
      .where(eq(projects.id, project.id))
    sent += 1
  }
  return sent
}

async function snapshotPortfolio() {
  const rows = await db.select().from(holdings)
  if (rows.length === 0) return false

  const quotes = await getQuotes(
    rows.filter((r) => r.coinId).map((r) => ({ coinId: r.coinId as string, symbol: r.symbol })),
  )
  const rates = await getRates()
  const usdRate = rateFor("USD", rates)

  let valueBase = 0
  let costBase = 0
  for (const row of rows) {
    const quote = row.coinId ? quotes.get(row.coinId) : null
    const amount = Number(row.amount) || 0
    if (quote) valueBase += Math.round(quote.priceUsd * amount * usdRate * 100)
    costBase += row.baseCost ?? 0
  }

  const date = todayISO()
  await db
    .insert(portfolioSnapshots)
    .values({ date, valueBase, costBase, createdAt: new Date().toISOString() })
    .onConflictDoUpdate({ target: portfolioSnapshots.date, set: { valueBase, costBase } })
  return true
}

async function recordDailyPrices(coins: { coinId: string; symbol: string }[]) {
  if (coins.length === 0) return 0
  const quotes = await getQuotes(coins)
  const date = todayISO()
  let saved = 0

  for (const coin of coins) {
    const quote = quotes.get(coin.coinId)
    if (!quote) continue
    const [existing] = await db
      .select({ id: priceHistory.id })
      .from(priceHistory)
      .where(and(eq(priceHistory.coinId, coin.coinId), eq(priceHistory.date, date)))

    if (existing) {
      await db.update(priceHistory).set({ priceUsd: String(quote.priceUsd) }).where(eq(priceHistory.id, existing.id))
    } else {
      await db
        .insert(priceHistory)
        .values({ id: randomUUID(), coinId: coin.coinId, date, priceUsd: String(quote.priceUsd) })
      saved += 1
    }
  }
  return saved
}

export async function runTick() {
  await ready()
  const coins = await trackedCoins()

  let backfilled = 0
  for (const coin of coins) backfilled += await backfillHistory(coin.coinId)

  const prices = await recordDailyPrices(coins)
  const alerts = await runAlerts()
  const taskReminders = await runTaskReminders()
  const paymentReminders = await runPaymentReminders()
  const snapshot = await snapshotPortfolio()
  await pruneLogs()

  return {
    coins: coins.length,
    backfilled,
    prices,
    alerts: alerts.fired,
    checkedRules: alerts.checked,
    taskReminders,
    paymentReminders,
    snapshot,
  }
}
