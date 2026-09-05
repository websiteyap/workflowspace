import type { Option, Tone } from "@/lib/constants"
import { cn } from "@/lib/utils"

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  blue: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  violet: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
}

const DOTS: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
}

export function StatusBadge({
  options,
  value,
  dot = true,
  className,
}: {
  options: Option[]
  value: string | null | undefined
  dot?: boolean
  className?: string
}) {
  const opt = options.find((o) => o.value === value)
  const t: Tone = opt?.tone ?? "neutral"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[t],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", DOTS[t])} />}
      {opt?.label ?? value ?? "—"}
    </span>
  )
}

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  )
}
