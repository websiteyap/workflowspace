"use client"

import { Bell, BellOff, BellRing, Check, Volume2, VolumeX } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  notificationPermission,
  playChime,
  requestNotificationPermission,
  setSoundEnabled,
  showNotification,
  soundEnabled,
  unlockAudio,
} from "./notification-store"

type Permission = NotificationPermission | "unsupported"

function usePermission() {
  const [permission, setPermission] = React.useState<Permission | null>(null)
  React.useEffect(() => setPermission(notificationPermission()), [])
  return [permission, setPermission] as const
}

export function NotificationBell() {
  const [permission, setPermission] = usePermission()

  if (permission === null || permission === "granted" || permission === "unsupported") return null

  const ask = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === "granted") {
      playChime(true)
      toast.success("Bildirimler açıldı")
    } else if (result === "denied") {
      toast.error("Bildirimler engellendi. Tarayıcı adres çubuğundaki kilit simgesinden açabilirsiniz.")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-amber-600 dark:text-amber-400"
      onClick={ask}
      title="Hatırlatıcı bildirimlerine izin ver"
    >
      <BellOff className="size-4" />
      <span className="sr-only">Bildirimlere izin ver</span>
    </Button>
  )
}

export function NotificationSettings() {
  const [permission, setPermission] = usePermission()
  const [sound, setSound] = React.useState(true)

  React.useEffect(() => setSound(soundEnabled()), [])

  const ask = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === "granted") toast.success("Bildirimler açıldı")
    else if (result === "denied") toast.error("Tarayıcı bildirimleri engelledi")
  }

  const test = () => {
    unlockAudio()
    playChime(true)
    const shown = showNotification("Test hatırlatıcısı", "Bildirimler böyle görünecek.", "source-test")
    toast(shown ? "Bildirim ve ses gönderildi" : "Ses çalındı — bildirim izni yok")
  }

  const status: Record<Permission, { label: string; tone: string; icon: typeof Bell }> = {
    granted: { label: "Açık", tone: "text-emerald-600 dark:text-emerald-400", icon: BellRing },
    default: { label: "İzin verilmedi", tone: "text-amber-600 dark:text-amber-400", icon: Bell },
    denied: { label: "Engellendi", tone: "text-red-600 dark:text-red-400", icon: BellOff },
    unsupported: { label: "Tarayıcı desteklemiyor", tone: "text-muted-foreground", icon: BellOff },
  }
  const current = permission ? status[permission] : null

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Hatırlatıcılar</h2>
        <p className="text-xs text-muted-foreground">
          Görevlere kurduğunuz hatırlatıcılar sesli uyarı ve tarayıcı bildirimi gönderir.
        </p>
      </div>

      <div className="divide-y">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm">Tarayıcı bildirimi</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs">
              {current ? (
                <>
                  <current.icon className={cn("size-3.5", current.tone)} />
                  <span className={current.tone}>{current.label}</span>
                </>
              ) : (
                <span className="text-muted-foreground">kontrol ediliyor…</span>
              )}
            </p>
          </div>
          {permission === "default" && (
            <Button size="sm" variant="outline" onClick={ask}>
              İzin ver
            </Button>
          )}
          {permission === "granted" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5" /> Hazır
            </span>
          )}
          {permission === "denied" && (
            <span className="max-w-[15rem] text-right text-xs text-muted-foreground">
              Adres çubuğundaki kilit simgesinden bu site için bildirimlere izin verin.
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="text-sm">Sesli uyarı</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Hatırlatma anında kısa bir çan sesi çalar.</p>
          </div>
          <div className="flex items-center gap-3">
            {sound ? (
              <Volume2 className="size-4 text-muted-foreground" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )}
            <Switch
              checked={sound}
              onCheckedChange={(v) => {
                setSound(v)
                setSoundEnabled(v)
                if (v) {
                  unlockAudio()
                  playChime(true)
                }
              }}
              aria-label="Sesli uyarı"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="text-sm">Deneme</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Bildirim ve sesi şimdi test edin.</p>
          </div>
          <Button size="sm" variant="outline" onClick={test} className="gap-1.5">
            <BellRing className="size-4" /> Test et
          </Button>
        </div>
      </div>

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Hatırlatıcılar Source sekmesi açıkken çalışır. Sekme arka planda olabilir, ancak tarayıcı tamamen
        kapalıyken bildirim gönderilemez.
      </p>
    </section>
  )
}
