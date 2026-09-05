"use client"

import { Check, KeyRound, Loader2, UserRound } from "lucide-react"
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
import { changePassword, changeUsername } from "@/lib/actions/auth"

function strength(password: string) {
  let score = 0
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^\w\s]/.test(password)) score += 1
  return Math.min(4, score)
}

const LEVELS = [
  { label: "Çok zayıf", tone: "bg-red-500" },
  { label: "Zayıf", tone: "bg-red-500" },
  { label: "Orta", tone: "bg-amber-500" },
  { label: "İyi", tone: "bg-emerald-500" },
  { label: "Güçlü", tone: "bg-emerald-500" },
]

export function AccountSection({ username, overridden }: { username: string | null; overridden: boolean }) {
  const [passwordOpen, setPasswordOpen] = React.useState(false)
  const [usernameOpen, setUsernameOpen] = React.useState(false)
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [code, setCode] = React.useState("")
  const [needCode, setNeedCode] = React.useState(false)
  const [newUsername, setNewUsername] = React.useState(username ?? "")
  const [usernamePassword, setUsernamePassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const level = strength(next)

  const reset = () => {
    setCurrent("")
    setNext("")
    setConfirm("")
    setCode("")
    setNeedCode(false)
  }

  const submitPassword = async () => {
    if (next !== confirm) {
      toast.error("Yeni parolalar eşleşmiyor")
      return
    }
    setBusy(true)
    try {
      const result = await changePassword(current, next, code)
      if (result.error) {
        if (result.stage === "need-code") setNeedCode(true)
        toast.error(result.error)
        return
      }
      toast.success("Parola değişti. Diğer cihazlardaki oturumlar kapatıldı.")
      setPasswordOpen(false)
      reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Hesap</h2>
        <p className="text-xs text-muted-foreground">Giriş bilgilerin</p>
      </div>

      <div className="divide-y">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm">Kullanıcı adı</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{username ?? "—"}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUsernameOpen(true)}>
            <UserRound className="size-4" /> Değiştir
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm">Parola</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {overridden ? "uygulamadan değiştirildi" : "kurulumdaki başlangıç parolası"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" /> Değiştir
          </Button>
        </div>
      </div>

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Parolanı unutursan sunucuda{" "}
        <code className="font-mono">/opt/backup/source-reset-password.sh</code> ile sıfırlayabilirsin.
      </p>

      <Dialog
        open={passwordOpen}
        onOpenChange={(o) => {
          setPasswordOpen(o)
          if (!o) reset()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parolayı değiştir</DialogTitle>
            <DialogDescription>
              Değişiklikten sonra bu cihaz dışındaki tüm oturumlar kapatılır.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mevcut parola</Label>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Yeni parola</Label>
              <Input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
              {next.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full ${i < level ? LEVELS[level].tone : "bg-muted"}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {LEVELS[level].label} · en az 12 karakter
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Yeni parola (tekrar)</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {needCode && (
              <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                <Label className="text-xs text-muted-foreground">Doğrulama kodu</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                  className="tabular tracking-[0.3em]"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPasswordOpen(false)}>
              Vazgeç
            </Button>
            <Button
              onClick={submitPassword}
              disabled={busy || !current || next.length < 12 || next !== confirm}
              className="gap-1.5"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Değiştir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={usernameOpen} onOpenChange={setUsernameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kullanıcı adını değiştir</DialogTitle>
            <DialogDescription>Onaylamak için parolanı gir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Yeni kullanıcı adı</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Parola</Label>
              <Input
                type="password"
                value={usernamePassword}
                onChange={(e) => setUsernamePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setUsernameOpen(false)}>
              Vazgeç
            </Button>
            <Button
              disabled={busy || !usernamePassword || newUsername.trim().length < 3}
              onClick={async () => {
                setBusy(true)
                try {
                  const result = await changeUsername(usernamePassword, newUsername)
                  if (result.error) {
                    toast.error(result.error)
                    return
                  }
                  toast.success("Kullanıcı adı değişti")
                  setUsernameOpen(false)
                  setUsernamePassword("")
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
