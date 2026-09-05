"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type PortfolioPoint = { date: string; label: string; value: number; cost: number }

function makeFormatter(currency: string) {
  return (v: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: Math.abs(v) >= 100_000 ? "compact" : "standard",
    }).format(v)
}

function ChartTooltip({
  active,
  payload,
  label,
  currency = "TRY",
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
  currency?: string
}) {
  if (!active || !payload?.length) return null
  const fmt = makeFormatter(currency)
  const value = payload.find((p) => p.dataKey === "value")?.value ?? 0
  const cost = payload.find((p) => p.dataKey === "cost")?.value ?? 0
  return (
    <div className="min-w-40 rounded-lg border bg-popover p-2.5 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-[2px]" style={{ background: "var(--viz-1)" }} />
          <span className="text-muted-foreground">Değer</span>
          <span className="ml-auto font-medium tabular text-popover-foreground">{fmt(value)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-[2px]" style={{ background: "var(--viz-2)" }} />
          <span className="text-muted-foreground">Maliyet</span>
          <span className="ml-auto font-medium tabular text-popover-foreground">{fmt(cost)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 border-t pt-1">
          <span className="text-muted-foreground">Fark</span>
          <span className="ml-auto font-medium tabular text-popover-foreground">{fmt(value - cost)}</span>
        </div>
      </div>
    </div>
  )
}

export function PortfolioChart({ data, currency = "TRY" }: { data: PortfolioPoint[]; currency?: string }) {
  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Grafik için en az iki günlük kayıt gerekir. Anlık görüntü her gün otomatik alınır.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-[2px]" style={{ background: "var(--viz-1)" }} /> Değer
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-[2px]" style={{ background: "var(--viz-2)" }} /> Maliyet
        </span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--viz-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--viz-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--viz-axis)", fontSize: 11 }} dy={4} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: "var(--viz-axis)", fontSize: 11 }}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(v)
              }
            />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            <Area type="monotone" dataKey="value" stroke="var(--viz-1)" strokeWidth={2} fill="url(#pv)" />
            <Area type="monotone" dataKey="cost" stroke="var(--viz-2)" strokeWidth={2} strokeDasharray="4 3" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
