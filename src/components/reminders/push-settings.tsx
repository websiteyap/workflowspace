"use client"

import { BellRing, Loader2, Smartphone } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { pushPublicKey, sendTestPush, subscribePush, unsubscribePush } from "@/lib/actions/push"
import { cn } from "@/lib/utils"

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(normalized)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function PushSettings({ subscriberCount }: { subscriberCount: number }) {
  const [supported, setSupported] = React.useState<boolean | null>(null)
  const [subscribed, setSubscribed] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setSupported(ok)
    if (!ok) return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => setSubscribed(false))
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("Bildirim izni verilmedi")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const key = await pushPublicKey()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const result = await subscribePush(json)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setSubscribed(true)
      toast.success("Bu cihaz için arka plan bildirimleri açıldı")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Abonelik kurulamadı")
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePush(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
      toast.success("Bu cihazdan kaldırıldı")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Arka plan bildirimleri</h2>
        <p className="text-xs text-muted-foreground">
          Uygulama kapalıyken de hatırlatıcı ve fiyat uyarısı gönderir.
        </p>
      </div>

      <div className="divide-y">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm">Bu cihaz</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {supported === null
                ? "kontrol ediliyor…"
                : supported
                  ? subscribed
                    ? "kayıtlı"
                    : "kayıtlı değil"
                  : "tarayıcı desteklemiyor"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Smartphone className={cn("size-4", subscribed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
            <Switch
              checked={subscribed}
              disabled={busy || supported !== true}
              onCheckedChange={(v) => (v ? enable() : disable())}
              aria-label="Arka plan bildirimleri"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="text-sm">Kayıtlı cihaz</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{subscriberCount} cihaza gönderiliyor</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={busy || subscriberCount === 0}
            onClick={async () => {
              setBusy(true)
              try {
                const result = await sendTestPush()
                toast.success(`${result.sent} cihaza gönderildi`)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Test gönder
          </Button>
        </div>
      </div>

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        iPhone&apos;da çalışması için siteyi Safari&apos;den <strong>Ana Ekrana Ekle</strong> ile kurman gerekir
        (iOS 16.4+). Android ve masaüstünde doğrudan çalışır.
      </p>
    </section>
  )
}
