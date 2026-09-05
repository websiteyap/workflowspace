"use client"

import { BellRing } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { type DueReminder, fetchDueReminders, markReminderFired, snoozeReminder, toggleTask } from "@/lib/actions/tasks"
import { playChime, showNotification } from "./notification-store"

const POLL_MS = 60_000

const HORIZON_MS = 75_000

export function ReminderEngine() {
  const router = useRouter()
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const fired = React.useRef(new Set<string>())

  const fire = React.useCallback(
    (r: DueReminder) => {
      if (fired.current.has(r.id)) return
      fired.current.add(r.id)
      timers.current.delete(r.id)

      playChime()
      showNotification("Hatırlatıcı", r.projectName ? `${r.title} · ${r.projectName}` : r.title, `task-${r.id}`)

      toast(r.title, {
        icon: <BellRing className="size-4" />,
        description: r.projectName ?? "Görev hatırlatıcısı",
        duration: 30_000,
        action: {
          label: "Tamamla",
          onClick: () => void toggleTask(r.id, true).then(() => router.refresh()),
        },
        cancel: {
          label: "10 dk ertele",
          onClick: () => {
            fired.current.delete(r.id)
            void snoozeReminder(r.id, 10).then(() => router.refresh())
          },
        },
      })

      void markReminderFired(r.id).then(() => router.refresh())
    },
    [router],
  )

  React.useEffect(() => {
    let cancelled = false

    const schedule = (r: DueReminder) => {
      if (fired.current.has(r.id) || timers.current.has(r.id)) return
      const delay = new Date(r.remindAt).getTime() - Date.now()
      if (delay <= 0) {
        fire(r)
        return
      }
      timers.current.set(
        r.id,
        setTimeout(() => fire(r), delay),
      )
    }

    const poll = async () => {
      try {
        const due = await fetchDueReminders(HORIZON_MS)
        if (cancelled) return
        for (const r of due) schedule(r)
      } catch {}
    }

    void poll()
    const interval = setInterval(poll, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll()
    }
    document.addEventListener("visibilitychange", onVisible)

    const pending = timers.current
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      for (const t of pending.values()) clearTimeout(t)
      pending.clear()
    }
  }, [fire])

  return null
}
