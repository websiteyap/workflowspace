"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type FxPoint = { date: string; label: string; USD: number; EUR: number; GBP: number }

const SERIES = [
  { key: "USD", color: "var(--viz-1)" },
  { key: "EUR", color: "var(--viz-2)" },
  { key: "GBP", color: "var(--viz-axis)" },
] as const

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-lg border bg-popover p-2.5 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      <div className="space-y-1">
        {SERIES.map((s) => {
          const value = payload.find((p) => p.dataKey === s.key)?.value
          if (value === undefined) return null
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.key}</span>
              <span className="ml-auto font-medium tabular text-popover-foreground">
                {value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function FxChart({ data }: { data: FxPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Kur geçmişi biriktikçe grafik oluşur. Kurlar her gün otomatik kaydedilir.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
            {s.key}
          </span>
        ))}
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--viz-axis)", fontSize: 11 }} dy={4} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              domain={["auto", "auto"]}
              tick={{ fill: "var(--viz-axis)", fontSize: 11 }}
            />
            <Tooltip content={<ChartTooltip />} />
            {SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
