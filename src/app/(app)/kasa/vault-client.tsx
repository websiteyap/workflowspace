"use client"

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { deleteVaultItem, initVault, saveVaultItem } from "@/lib/actions/vault"
import { VAULT_CATEGORY } from "@/lib/constants"
import {
  CHECK_PLAINTEXT,
  type VaultEntry,
  decryptEntry,
  deriveKey,
  encrypt,
  encryptEntry,
  generatePassword,
  randomSalt,
} from "@/lib/vault/crypto"
import { decrypt } from "@/lib/vault/crypto"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const AUTO_LOCK_MS = 5 * 60 * 1000

type Row = { id: string; cipher: string; createdAt: string; updatedAt: string }
type Decrypted = Row & { entry: VaultEntry }

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground"
      title={`${label} kopyala`}
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success(`${label} kopyalandı`)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span className="sr-only">{label} kopyala</span>
    </Button>
  )
}

function EntryDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: Decrypted
  onSave: (entry: VaultEntry, id: string | null) => Promise<void>
}) {
  const [entry, setEntry] = React.useState<VaultEntry>(
    initial?.entry ?? { title: "", category: "other", username: "", password: "", url: "", notes: "" },
  )
  const [show, setShow] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setEntry(initial?.entry ?? { title: "", category: "other", username: "", password: "", url: "", notes: "" })
      setShow(false)
    }
  }, [open, initial])

  const set = (patch: Partial<VaultEntry>) => setEntry((e) => ({ ...e, ...patch }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Kaydı düzenle" : "Yeni kayıt"}</DialogTitle>
          <DialogDescription>Kaydedilmeden önce tarayıcında şifrelenir.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Başlık</Label>
            <Input value={entry.title} onChange={(e) => set({ title: e.target.value })} placeholder="Hetzner sunucu" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategori</Label>
              <Select value={entry.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAULT_CATEGORY.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kullanıcı adı</Label>
              <Input value={entry.username ?? ""} onChange={(e) => set({ username: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Parola / anahtar</Label>
            <div className="flex gap-2">
              <Input
                type={show ? "text" : "password"}
                value={entry.password ?? ""}
                onChange={(e) => set({ password: e.target.value })}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setShow((v) => !v)}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Rastgele üret"
                onClick={() => {
                  set({ password: generatePassword() })
                  setShow(true)
                }}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Adres</Label>
            <Input value={entry.url ?? ""} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Not</Label>
            <Textarea rows={3} value={entry.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || !entry.title.trim()}
            onClick={async () => {
              setBusy(true)
              try {
                await onSave(entry, initial?.id ?? null)
                onOpenChange(false)
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
  )
}

export function VaultClient({
  initialized,
  salt,
  check,
  rows,
}: {
  initialized: boolean
  salt: string | null
  check: string | null
  rows: Row[]
}) {
  const [key, setKey] = React.useState<CryptoKey | null>(null)
  const [items, setItems] = React.useState<Decrypted[]>([])
  const [master, setMaster] = React.useState("")
  const [confirmMaster, setConfirmMaster] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [q, setQ] = React.useState("")
  const [editing, setEditing] = React.useState<Decrypted | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [revealed, setRevealed] = React.useState<string | null>(null)
  const lockTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const lock = React.useCallback(() => {
    setKey(null)
    setItems([])
    setMaster("")
    setRevealed(null)
    if (lockTimer.current) clearTimeout(lockTimer.current)
  }, [])

  const resetTimer = React.useCallback(() => {
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => {
      lock()
      toast.info("Kasa otomatik kilitlendi")
    }, AUTO_LOCK_MS)
  }, [lock])

  React.useEffect(() => {
    if (!key) return
    resetTimer()
    const events = ["click", "keydown"] as const
    for (const e of events) window.addEventListener(e, resetTimer)
    return () => {
      for (const e of events) window.removeEventListener(e, resetTimer)
      if (lockTimer.current) clearTimeout(lockTimer.current)
    }
  }, [key, resetTimer])

  const decryptAll = React.useCallback(async (k: CryptoKey, source: Row[]) => {
    const out: Decrypted[] = []
    for (const row of source) {
      try {
        out.push({ ...row, entry: await decryptEntry(k, row.cipher) })
      } catch {
        /* bozuk kayit atlanir */
      }
    }
    return out
  }, [])

  const setup = async () => {
    setError("")
    if (master.length < 10) return setError("Ana parola en az 10 karakter olmalı.")
    if (master !== confirmMaster) return setError("Parolalar eşleşmiyor.")

    setBusy(true)
    try {
      const newSalt = randomSalt()
      const k = await deriveKey(master, newSalt)
      const sealed = await encrypt(k, CHECK_PLAINTEXT)
      const result = await initVault(newSalt, sealed)
      if (result.error) {
        setError(result.error)
        return
      }
      setKey(k)
      setItems([])
      toast.success("Kasa kuruldu")
    } finally {
      setBusy(false)
    }
  }

  const unlock = async () => {
    setError("")
    if (!salt || !check) return
    setBusy(true)
    try {
      const k = await deriveKey(master, salt)
      try {
        const value = await decrypt(k, check)
        if (value !== CHECK_PLAINTEXT) throw new Error("mismatch")
      } catch {
        setError("Ana parola hatalı.")
        return
      }
      setKey(k)
      setItems(await decryptAll(k, rows))
      setMaster("")
    } finally {
      setBusy(false)
    }
  }

  const persist = async (entry: VaultEntry, id: string | null) => {
    if (!key) return
    const cipher = await encryptEntry(key, entry)
    const result = await saveVaultItem(id, cipher)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setItems((prev) => {
      const now = new Date().toISOString()
      if (id) return prev.map((i) => (i.id === id ? { ...i, entry, updatedAt: now } : i))
      return [{ id: crypto.randomUUID(), cipher, createdAt: now, updatedAt: now, entry }, ...prev]
    })
    toast.success("Kaydedildi")
  }

  if (!initialized) {
    return (
      <div className="space-y-6">
        <PageHeader title="Kasa" description="Şifreler ve gizli anahtarlar" />
        <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5" />
            <h2 className="font-medium">Kasayı kur</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Kasa <strong>ayrı bir ana parola</strong> ile açılır. Bu parola sunucuya hiç gönderilmez; şifreleme
            ve çözme tarayıcında yapılır. Parolanı unutursan kayıtlar geri getirilemez.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ana parola</Label>
            <Input type="password" value={master} onChange={(e) => setMaster(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tekrar</Label>
            <Input
              type="password"
              value={confirmMaster}
              onChange={(e) => setConfirmMaster(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button className="w-full" onClick={setup} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Kasayı oluştur
          </Button>
        </div>
      </div>
    )
  }

  if (!key) {
    return (
      <div className="space-y-6">
        <PageHeader title="Kasa" description={`${rows.length} kayıt · kilitli`} />
        <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Lock className="size-5" />
            <h2 className="font-medium">Kasa kilitli</h2>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ana parola</Label>
            <Input
              type="password"
              value={master}
              onChange={(e) => setMaster(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button className="w-full gap-1.5" onClick={unlock} disabled={busy || !master}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
            Kilidi aç
          </Button>
          <p className="text-[11px] text-muted-foreground">
            5 dakika işlem yapılmazsa kasa otomatik kilitlenir.
          </p>
        </div>
      </div>
    )
  }

  const filtered = items.filter((i) =>
    q
      ? `${i.entry.title} ${i.entry.username ?? ""} ${i.entry.url ?? ""}`.toLowerCase().includes(q.toLowerCase())
      : true,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kasa"
        description={`${items.length} kayıt · açık`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={lock}>
              <Lock className="size-4" /> Kilitle
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Yeni kayıt
            </Button>
          </div>
        }
      />

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kasada ara…" className="h-9 sm:max-w-xs" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={items.length === 0 ? "Kasa boş" : "Eşleşen kayıt yok"}
          description={
            items.length === 0
              ? "Sunucu erişimleri, API anahtarları ve panel şifrelerini burada tut."
              : "Aramayı değiştirmeyi dene."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.id} className="group rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.entry.title}</p>
                  {item.entry.username && (
                    <p className="truncate font-mono text-xs text-muted-foreground">{item.entry.username}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(item)}>
                      <Pencil className="size-4" /> Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={async () => {
                        await deleteVaultItem(item.id)
                        setItems((prev) => prev.filter((i) => i.id !== item.id))
                        toast.success("Silindi")
                      }}
                    >
                      <Trash2 className="size-4" /> Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3">
                <StatusBadge options={VAULT_CATEGORY} value={item.entry.category} />
              </div>

              {item.entry.password && (
                <div className="mt-3 flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1.5">
                  <span className={cn("min-w-0 flex-1 truncate font-mono text-xs", revealed !== item.id && "select-none")}>
                    {revealed === item.id ? item.entry.password : "••••••••••••"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    onClick={() => setRevealed(revealed === item.id ? null : item.id)}
                  >
                    {revealed === item.id ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <CopyButton value={item.entry.password} label="Parola" />
                </div>
              )}

              {item.entry.url && (
                <a
                  href={item.entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {item.entry.url.replace(/^https?:\/\//, "")}
                </a>
              )}

              {item.entry.notes && (
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{item.entry.notes}</p>
              )}

              <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
                {formatDateTime(item.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Kayıtlar tarayıcında AES-256-GCM ile şifrelenir; sunucu yalnızca şifreli veriyi görür. Ana parolan
          hiçbir yere gönderilmez ve saklanmaz — unutursan kayıtlar geri getirilemez. Banka ve kimlik gibi en
          kritik hesaplar için bağımsız denetimden geçmiş bir parola yöneticisi daha güvenlidir.
        </p>
      </div>

      <EntryDialog open={adding} onOpenChange={setAdding} onSave={persist} />
      <EntryDialog
        key={editing?.id}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing ?? undefined}
        onSave={persist}
      />
    </div>
  )
}
