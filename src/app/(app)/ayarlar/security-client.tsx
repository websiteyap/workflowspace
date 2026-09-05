"use client"

import { Check, Copy, Loader2, LogOut, Monitor, ShieldCheck, ShieldOff, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/form-dialog"
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
import type { Session } from "@/db/schema"
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  endOtherSessions,
  endSession,
} from "@/lib/actions/auth"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

function RecoveryCodes({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false)
  const text = codes.join("\n")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kurtarma kodların</DialogTitle>
          <DialogDescription>
            Telefonunu kaybedersen bu kodlarla girebilirsin. Her kod bir kez kullanılır. Bu ekranı kapatınca
            bir daha gösterilmez — güvenli bir yere kaydet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-sm">
          {codes.map((code) => (
            <span key={code} className="tabular">
              {code}
            </span>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              void navigator.clipboard.writeText(text)
              setCopied(true)
              toast.success("Kodlar kopyalandı")
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Kopyala
          </Button>
          <Button onClick={onClose}>Kaydettim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = React.useState<{ secret: string; url: string; qr: string } | null>(null)
  const [code, setCode] = React.useState("")
  const [recovery, setRecovery] = React.useState<string[] | null>(null)
  const [disableOpen, setDisableOpen] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [busy, start] = React.useTransition()

  const begin = () =>
    start(async () => {
      const result = await beginTwoFactorSetup()
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      const url = (result as { url: string }).url
      const qr = await fetch(`/api/qr?data=${encodeURIComponent(url)}`).then((r) => r.text())
      setSetup({ secret: (result as { secret: string }).secret, url, qr })
    })

  const confirm = () =>
    start(async () => {
      const result = await confirmTwoFactorSetup(code)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setSetup(null)
      setCode("")
      setRecovery(result.recoveryCodes ?? [])
      toast.success("İki adımlı doğrulama açıldı")
    })

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">İki adımlı doğrulama</h2>
        <p className="text-xs text-muted-foreground">
          Parolanın yanında doğrulayıcı uygulamadan 6 haneli kod ister.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm">
          {enabled ? (
            <>
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Açık</span>
            </>
          ) : (
            <>
              <ShieldOff className="size-4 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-600 dark:text-amber-400">Kapalı</span>
            </>
          )}
        </p>
        {enabled ? (
          <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
            Kapat
          </Button>
        ) : (
          <Button size="sm" onClick={begin} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Kur
          </Button>
        )}
      </div>

      {setup && (
        <div className="space-y-4 border-t px-4 py-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qr}
              alt="2FA QR kodu"
              width={168}
              height={168}
              className="rounded-lg border bg-white p-2"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm">
                Google Authenticator, 1Password veya Authy ile QR kodu okut. Okutamazsan bu anahtarı elle gir:
              </p>
              <code className="block break-all rounded-md border bg-muted px-2 py-1.5 font-mono text-xs">
                {setup.secret}
              </code>
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="totp-code" className="text-xs text-muted-foreground">
                  Uygulamadaki kodu gir
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="totp-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    placeholder="123456"
                    className="tabular tracking-[0.3em]"
                  />
                  <Button onClick={confirm} disabled={busy || code.length < 6}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Doğrula
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {recovery && <RecoveryCodes codes={recovery} onClose={() => setRecovery(null)} />}

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>İki adımlı doğrulamayı kapat</DialogTitle>
            <DialogDescription>Onaylamak için parolanı gir.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parola"
            autoComplete="current-password"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDisableOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !password}
              onClick={() =>
                start(async () => {
                  const result = await disableTwoFactor(password)
                  if (result.error) toast.error(result.error)
                  else {
                    toast.success("Kapatıldı")
                    setDisableOpen(false)
                    setPassword("")
                  }
                })
              }
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function describeAgent(agent: string | null) {
  if (!agent) return "Bilinmeyen cihaz"
  const browser = /Edg/.test(agent)
    ? "Edge"
    : /Chrome/.test(agent)
      ? "Chrome"
      : /Safari/.test(agent)
        ? "Safari"
        : /Firefox/.test(agent)
          ? "Firefox"
          : "Tarayıcı"
  const os = /Windows/.test(agent)
    ? "Windows"
    : /Android/.test(agent)
      ? "Android"
      : /iPhone|iPad/.test(agent)
        ? "iOS"
        : /Mac OS/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : ""
  return os ? `${browser} · ${os}` : browser
}

export function SessionsSection({ sessions, currentId }: { sessions: Session[]; currentId: string }) {
  const [revokeAll, setRevokeAll] = React.useState(false)
  const [, start] = React.useTransition()
  const others = sessions.filter((s) => s.id !== currentId)

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Açık oturumlar</h2>
          <p className="text-xs text-muted-foreground">Giriş yapılmış cihazlar</p>
        </div>
        {others.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRevokeAll(true)}>
            <LogOut className="size-4" /> Diğerlerini kapat
          </Button>
        )}
      </div>

      <ul className="divide-y">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <Monitor className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm">
                {describeAgent(s.userAgent)}
                {s.id === currentId && (
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    bu cihaz
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {s.ip ?? "IP yok"} · son görülme {formatDateTime(s.lastSeenAt ?? s.createdAt)}
              </p>
            </div>
            {s.id !== currentId && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-8 text-muted-foreground hover:text-destructive")}
                onClick={() =>
                  start(async () => {
                    await endSession(s.id)
                    toast.success("Oturum kapatıldı")
                  })
                }
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Oturumu kapat</span>
              </Button>
            )}
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">Açık oturum yok</li>
        )}
      </ul>

      <ConfirmDialog
        open={revokeAll}
        onOpenChange={setRevokeAll}
        onConfirm={() => endOtherSessions()}
        title="Diğer oturumlar kapatılsın mı?"
        description={`Bu cihaz dışındaki ${others.length} oturum sonlandırılacak.`}
        confirmLabel="Kapat"
        successMessage="Diğer oturumlar kapatıldı"
      />
    </section>
  )
}
