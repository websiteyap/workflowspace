"use client"

import { Check, Copy, Loader2, RefreshCw, Send, Trash2, Webhook } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  removeTelegram,
  rotateWebhookToken,
  saveTelegram,
  sendTestNotification,
  toggleTelegram,
} from "@/lib/actions/integrations"

export function TelegramSection({
  configured,
  enabled,
  chatId,
  tokenPreview,
}: {
  configured: boolean
  enabled: boolean
  chatId: string | null
  tokenPreview: string | null
}) {
  const router = useRouter()
  const [token, setToken] = React.useState("")
  const [chat, setChat] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Telegram bildirimleri</h2>
        <p className="text-xs text-muted-foreground">
          Hatırlatıcılar, ödeme vadeleri ve fiyat uyarıları Telegram&apos;a da düşer.
        </p>
      </div>

      {configured ? (
        <div className="divide-y">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm">Bağlı</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {tokenPreview} · chat {chatId}
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={busy}
              onCheckedChange={async (v) => {
                setBusy(true)
                try {
                  await toggleTelegram(v)
                  toast.success(v ? "Açıldı" : "Kapatıldı")
                  router.refresh()
                } finally {
                  setBusy(false)
                }
              }}
              aria-label="Telegram bildirimleri"
            />
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <p className="text-sm text-muted-foreground">Test mesajı gönder</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const r = await sendTestNotification()
                    toast.success(
                      `Push: ${r.push ? "gönderildi" : "yok"} · Telegram: ${r.telegram ? "gönderildi" : "gönderilemedi"}`,
                    )
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Test
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={async () => {
                  await removeTelegram()
                  toast.success("Bağlantı kaldırıldı")
                  router.refresh()
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bot token</Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:AAH…"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Chat ID</Label>
            <Input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              placeholder="987654321"
              className="font-mono text-xs"
            />
          </div>
          <Button
            size="sm"
            disabled={busy || !token || !chat}
            className="gap-1.5"
            onClick={async () => {
              setBusy(true)
              try {
                const result = await saveTelegram(token, chat)
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                toast.success("Bağlandı, test mesajı gönderildi")
                setToken("")
                setChat("")
                router.refresh()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Bağla
          </Button>
          <p className="text-xs text-muted-foreground">
            Telegram&apos;da <code className="font-mono">@BotFather</code> ile bot oluştur, token&apos;ı al.
            Chat ID için botuna bir mesaj yaz, sonra{" "}
            <code className="font-mono">api.telegram.org/bot&lt;token&gt;/getUpdates</code> adresini aç.
          </p>
        </div>
      )}
    </section>
  )
}

export function WebhookSection({ token, baseUrl }: { token: string; baseUrl: string }) {
  const router = useRouter()
  const [copied, setCopied] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const url = `${baseUrl}/api/webhook?t=${token}`

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Webhook className="size-4" /> Webhook
        </h2>
        <p className="text-xs text-muted-foreground">
          Dış sistemlerden görev, hareket veya bildirim oluştur.
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        <code className="block break-all rounded-md border bg-muted px-2 py-1.5 font-mono text-[11px]">{url}</code>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              void navigator.clipboard.writeText(url)
              setCopied(true)
              toast.success("Kopyalandı")
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Kopyala
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await rotateWebhookToken()
                toast.success("Yeni token üretildi")
                router.refresh()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Yenile
          </Button>
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Kullanım örnekleri</summary>
          <pre className="mt-2 overflow-x-auto rounded-md border bg-muted/60 p-2 font-mono text-[11px] scrollbar-thin">
{`# Görev oluştur
curl -X POST "${url}" -H "content-type: application/json" \\
  -d '{"type":"task","title":"Sunucu bakımı","dueDate":"2026-09-10"}'

# Gider kaydet
curl -X POST "${url}" -H "content-type: application/json" \\
  -d '{"type":"expense","amount":"149.90","currency":"USD","description":"Vercel"}'

# Bildirim gönder
curl -X POST "${url}" -H "content-type: application/json" \\
  -d '{"type":"notify","title":"Deploy bitti","body":"Prod güncellendi"}'`}
          </pre>
        </details>
      </div>
    </section>
  )
}
