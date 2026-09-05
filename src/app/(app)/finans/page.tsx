import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { CashflowChart } from "@/components/charts/cashflow-chart"
import { CategoryBars } from "@/components/charts/category-bars"
import { FxChart } from "@/components/charts/fx-chart"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBase, fromBase, monthRange } from "@/lib/format"
import { moneyContext } from "@/lib/display-currency"
import {
  cashflowSeries,
  categoryBreakdown,
  financeSummary,
  fxHistory,
  lookups,
  reservedTotal,
  transactionsList,
} from "@/lib/queries"
import { cn } from "@/lib/utils"
import { NewTransactionButton, TransactionsTable } from "./finance-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Gelir / Gider" }

const PERIODS = [
  { value: "month", label: "Bu ay" },
  { value: "prev", label: "Geçen ay" },
  { value: "quarter", label: "Son 3 ay" },
  { value: "year", label: "Bu yıl" },
  { value: "all", label: "Tümü" },
]

function resolvePeriod(period: string) {
  const year = new Date().getFullYear()
  switch (period) {
    case "prev": {
      const r = monthRange(-1)
      return { from: r.start, to: r.end, label: r.label, months: 6 }
    }
    case "quarter": {
      const start = monthRange(-2)
      const end = monthRange(0)
      return { from: start.start, to: end.end, label: "Son 3 ay", months: 6 }
    }
    case "year":
      return { from: `${year}-01-01`, to: `${year}-12-31`, label: `${year}`, months: 12 }
    case "all":
      return { from: "1970-01-01", to: "2999-12-31", label: "Tüm zamanlar", months: 12 }
    default: {
      const r = monthRange(0)
      return { from: r.start, to: r.end, label: r.label, months: 6 }
    }
  }
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const sp = await searchParams
  const period = sp.period ?? "month"
  const range = resolvePeriod(period)

  const [summary, series, incomeCats, expenseCats, txs, look, mc] = await Promise.all([
    financeSummary(range.from, range.to),
    cashflowSeries(range.months),
    categoryBreakdown("income", range.from, range.to),
    categoryBreakdown("expense", range.from, range.to),
    transactionsList({ from: range.from, to: range.to }),
    lookups(),
    moneyContext(),
  ])
  const [reserved, fxSeries] = await Promise.all([reservedTotal(), fxHistory(90)])
  const { display, rates } = mc
  const fmt = (v: number) => formatBase(v, display, rates)
  const chartData = series.map((s) => ({
    ...s,
    income: fromBase(s.income, display, rates) / 100,
    expense: fromBase(s.expense, display, rates) / 100,
    net: fromBase(s.net, display, rates) / 100,
  }))

  const margin = summary.income > 0 ? Math.round((summary.net / summary.income) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir / Gider"
        description={`${range.label} · ${summary.count} hareket · ${display} cinsinden`}
        actions={
          <Suspense fallback={null}>
            <NewTransactionButton projects={look.projects} goals={look.goals} />
          </Suspense>
        }
      />

      <div className="flex flex-wrap items-center gap-1 rounded-lg border p-0.5 sm:w-fit">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/finans?period=${p.value}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam gelir" value={fmt(summary.income)} icon={TrendingUp} />
        <StatCard label="Toplam gider" value={fmt(summary.expense)} icon={TrendingDown} />
        <StatCard
          label="Net"
          value={fmt(summary.net)}
          icon={Wallet}
          accent={summary.net >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Serbest bakiye"
          value={fmt(summary.net - reserved)}
          icon={PiggyBank}
          hint={reserved > 0 ? `${fmt(reserved)} kumbarada bloke` : `kâr marjı %${margin}`}
          accent={summary.net - reserved >= 0 ? undefined : "negative"}
        />
      </div>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Nakit akışı</h2>
          <p className="text-xs text-muted-foreground">Son {range.months} ay</p>
        </div>
        <div className="p-4">
          <CashflowChart data={chartData} currency={display} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Gelir kategorileri</h2>
            <p className="text-xs text-muted-foreground">{range.label}</p>
          </div>
          <div className="p-4">
            <CategoryBars data={incomeCats} variant="income" display={display} rates={rates} emptyText="Bu dönemde gelir kaydı yok" />
          </div>
        </section>
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Gider kategorileri</h2>
            <p className="text-xs text-muted-foreground">{range.label}</p>
          </div>
          <div className="p-4">
            <CategoryBars data={expenseCats} variant="expense" display={display} rates={rates} emptyText="Bu dönemde gider kaydı yok" />
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Kur geçmişi</h2>
          <p className="text-xs text-muted-foreground">Son 90 gün · 1 birim kaç TL</p>
        </div>
        <div className="p-4">
          <FxChart data={fxSeries} />
        </div>
      </section>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TransactionsTable
          transactions={txs}
          projects={look.projects}
          goals={look.goals}
          display={display}
          rates={rates}
        />
      </Suspense>
    </div>
  )
}
