import { ALL_CATEGORIES, label as labelOf } from "@/lib/constants"
import { money } from "@/lib/format"

export function CategoryBars({
  data,
  variant = "income",
  currency = "TRY",
  emptyText = "Kayıt yok",
}: {
  data: { category: string; total: number }[]
  variant?: "income" | "expense"
  currency?: string
  emptyText?: string
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  const color = variant === "income" ? "var(--viz-1)" : "var(--viz-2)"
  const max = Math.max(...data.map((d) => d.total), 1)
  const sum = data.reduce((a, b) => a + b.total, 0)

  return (
    <ul className="space-y-3">
      {data.slice(0, 8).map((d) => {
        const pct = Math.round((d.total / sum) * 100)
        return (
          <li key={d.category} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{labelOf(ALL_CATEGORIES, d.category)}</span>
              <span className="shrink-0 tabular font-medium">
                {money(d.total, currency)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">%{pct}</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (d.total / max) * 100)}%`, background: color }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
