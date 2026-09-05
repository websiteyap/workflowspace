import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  accent,
  className,
}: {
  label: string
  value: string
  hint?: string
  delta?: number | null
  icon?: React.ComponentType<{ className?: string }>
  accent?: "positive" | "negative" | "neutral"
  className?: string
}) {
  const up = (delta ?? 0) >= 0
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular",
          accent === "positive" && "text-emerald-600 dark:text-emerald-400",
          accent === "negative" && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            %{Math.abs(Math.round(delta))}
          </span>
        )}
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </div>
  )
}
