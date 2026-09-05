"use client"

import { BellOff, BellRing } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isoToLocalInput } from "@/lib/format"
import { cn } from "@/lib/utils"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function inMinutes(min: number) {
  return toInputValue(new Date(Date.now() + min * 60_000))
}

function atHour(dayOffset: number, hour: number) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return toInputValue(d)
}

const PRESETS = [
  { label: "1 saat sonra", value: () => inMinutes(60) },
  { label: "3 saat sonra", value: () => inMinutes(180) },
  { label: "Bugün 18:00", value: () => atHour(0, 18) },
  { label: "Yarın 09:00", value: () => atHour(1, 9) },
]

export function ReminderField({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = React.useState(() => isoToLocalInput(defaultValue))

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="remindAt" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {value ? <BellRing className="size-3.5" /> : <BellOff className="size-3.5" />}
          Hatırlatıcı
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => setValue("")}
          >
            Kaldır
          </Button>
        )}
      </div>

      <Input
        id="remindAt"
        name="remindAt"
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="tabular [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:dark:invert"
      />

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const next = p.value()
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setValue(next)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                value === next ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/80">
        Sesli uyarı ve tarayıcı bildirimi gönderilir — bunun için Source sekmesinin açık olması gerekir.
      </p>
    </div>
  )
}
