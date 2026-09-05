import { desc } from "drizzle-orm"
import { db, ready } from "@/db"
import { alertEvents, alertRules, holdings, wallets } from "@/db/schema"
import { moneyContext } from "@/lib/display-currency"
import { rateFor } from "@/lib/format"
import { getQuotes } from "@/lib/market"
import { InvestmentsClient, type Position } from "./investments-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Yatırım" }

export default async function InvestmentsPage() {
  await ready()
  const [rows, walletRows, rules, events, money] = await Promise.all([
    db.select().from(holdings).orderBy(desc(holdings.updatedAt)),
    db.select().from(wallets).orderBy(desc(wallets.createdAt)),
    db.select().from(alertRules).orderBy(desc(alertRules.createdAt)),
    db.select().from(alertEvents).orderBy(desc(alertEvents.createdAt)).limit(20),
    moneyContext(),
  ])

  const quotes = await getQuotes(
    rows.filter((r) => r.coinId).map((r) => ({ coinId: r.coinId as string, symbol: r.symbol })),
  )
  const usdRate = rateFor("USD", money.rates)

  const positions: Position[] = rows.map((row) => {
    const quote = row.coinId ? (quotes.get(row.coinId) ?? null) : null
    const amount = Number(row.amount) || 0
    const valueBase = quote ? Math.round(quote.priceUsd * amount * usdRate * 100) : 0
    const costBase = row.baseCost ?? 0
    const pnlBase = costBase > 0 ? valueBase - costBase : 0
    return {
      ...row,
      quote,
      valueBase,
      costBase,
      pnlBase,
      pnlPercent: costBase > 0 ? (pnlBase / costBase) * 100 : null,
    }
  })

  return (
    <InvestmentsClient
      positions={positions}
      wallets={walletRows}
      rules={rules}
      events={events}
      display={money.display}
      rates={money.rates}
      usdRate={usdRate}
    />
  )
}
