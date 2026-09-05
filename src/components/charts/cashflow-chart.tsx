"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type CashflowPoint = { month: string; label: string; income: number; expense: number; net: number }

const SERIES = [
  { key: "income", name: "Gelir", color: "var(--viz-1)" },
  { key: "expense", name: "Gider", color: "var(--viz-2)" },
] as const

function fmt(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
    notation: Math.abs(v) >= 100_000 ? "compact" : "standard",
  }).format(v)
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const income = payload.find((p) => p.dataKey === "income")?.value ?? 0
  const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0
  return (
    <div className="min-w-40 rounded-lg border bg-popover p-2.5 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      <div className="space-y-1">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="ml-auto font-medium tabular text-popover-foreground">
              {fmt(s.key === "income" ? income : expense)}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 border-t pt-1">
          <span className="text-muted-foreground">Net</span>
          <span className="ml-auto font-medium tabular text-popover-foreground">{fmt(income - expense)}</span>
        </div>
      </div>
    </div>
  )
}

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const empty = data.every((d) => d.income === 0 && d.expense === 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="h-64 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Bu dönemde kayıtlı hareket yok
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barGap={2} barCategoryGap="30%">
              <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--viz-axis)", fontSize: 11 }}
                dy={4}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tick={{ fill: "var(--viz-axis)", fontSize: 11 }}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(v)
                }
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={34} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
