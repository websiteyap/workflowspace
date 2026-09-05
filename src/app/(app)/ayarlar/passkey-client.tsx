"use client"

import { startRegistration } from "@simplewebauthn/browser"
import { Fingerprint, Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Passkey } from "@/db/schema"
import { beginPasskeyRegistration, deletePasskey, finishPasskeyRegistration } from "@/lib/actions/passkeys"
import { formatDateTime } from "@/lib/format"

export function PasskeySection({ items }: { items: Passkey[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [supported, setSupported] = React.useState(true)

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && Boolean(window.PublicKeyCredential))
  }, [])

  const register = async () => {
    setBusy(true)
    try {
      const options = await beginPasskeyRegistration()
      const response = await startRegistration({ optionsJSON: options })
      const result = await finishPasskeyRegistration(response, label || "Cihaz")
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Passkey eklendi")
      setOpen(false)
      setLabel("")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "İşlem iptal edildi"
      if (!message.toLowerCase().includes("abort")) toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Passkey</h2>
          <p className="text-xs text-muted-foreground">Parmak izi, yüz tanıma veya cihaz PIN kodu ile giriş</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={!supported} onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {supported
            ? "Kayıtlı passkey yok. Eklersen giriş ekranında parola yerine tek dokunuşla girebilirsin."
            : "Bu tarayıcı passkey desteklemiyor."}
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Fingerprint className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.backedUp === 1 ? "senkronize" : "cihaza özel"} · eklendi {formatDateTime(p.createdAt)}
                  {p.lastUsedAt ? ` · son kullanım ${formatDateTime(p.lastUsedAt)}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await deletePasskey(p.id)
                  toast.success("Passkey silindi")
                  router.refresh()
                }}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Sil</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Passkey ekle</DialogTitle>
            <DialogDescription>Cihazın kimlik doğrulaması açılacak. Bu cihaza bir isim ver.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cihaz adı</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="iPhone, iş bilgisayarı…"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={register} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
              Devam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
