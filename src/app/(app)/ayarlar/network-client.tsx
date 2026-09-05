"use client"

import { Globe, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveIpAllowlist } from "@/lib/actions/auth"
import { cn } from "@/lib/utils"

export function NetworkSection({ list, current }: { list: string[]; current: string | null }) {
  const router = useRouter()
  const [rules, setRules] = React.useState(list)
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const persist = async (next: string[]) => {
    setBusy(true)
    try {
      const result = await saveIpAllowlist(next)
      if (result.error) {
        toast.error(result.error)
        return false
      }
      setRules(next)
      toast.success(next.length === 0 ? "Kısıtlama kaldırıldı" : "Kaydedildi")
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Ağ kısıtlaması</h2>
        <p className="text-xs text-muted-foreground">
          Liste boşken her yerden erişilir. Doluysa yalnızca listedeki adresler girebilir.
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Şu anki adresin:</span>
          <code className="font-mono">{current ?? "bilinmiyor"}</code>
          {current && !rules.includes(current) && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7"
              disabled={busy}
              onClick={() => persist([...rules, current])}
            >
              Ekle
            </Button>
          )}
        </div>

        {rules.length > 0 && (
          <ul className="space-y-1.5">
            {rules.map((rule) => (
              <li key={rule} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                <ShieldCheck
                  className={cn(
                    "size-3.5 shrink-0",
                    current === rule ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                />
                <code className="flex-1 font-mono text-xs">{rule}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => persist(rules.filter((r) => r !== rule))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="88.230. veya 88.230.12.* veya tam adres"
            className="h-9 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={busy || !draft.trim()}
            onClick={async () => {
              if (await persist([...rules, draft.trim()])) setDraft("")
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ekle
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Kendi adresin listede yoksa kayıt engellenir — kendini kilitlemene izin verilmez. Mobil
          bağlantıda IP sık değişir; <code className="font-mono">88.230.*</code> gibi bir önek kullanmak
          daha rahat olur. Yine de kilitlenirsen sunucuda{" "}
          <code className="font-mono">source-reset-password.sh</code> bu listeyi de temizler.
        </p>
      </div>
    </section>
  )
}
