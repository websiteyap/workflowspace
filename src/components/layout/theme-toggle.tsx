"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", icon: Sun, label: "Açık" },
  { value: "system", icon: Monitor, label: "Sistem" },
  { value: "dark", icon: Moon, label: "Koyu" },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={`${o.label} tema`}
          onClick={() => setTheme(o.value)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-colors",
            mounted && theme === o.value
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
