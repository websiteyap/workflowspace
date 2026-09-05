"use client"

import { Database, Download, Loader2, Trash2, Upload } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { NotificationSettings } from "@/components/reminders/notification-settings"
import { Button } from "@/components/ui/button"
import { clearAllData, exportData, importData } from "@/lib/actions/data"

export function DataTools({ counts }: { counts: Record<string, number> }) {
  const [clearOpen, setClearOpen] = React.useState(false)
  const [busy, start] = React.useTransition()
  const fileRef = React.useRef<HTMLInputElement>(null)

  const onImport = (file: File) =>
    start(async () => {
      const text = await file.text()
      const result = await importData(text)
      if (result.error) toast.error(result.error)
      else toast.success(`İçe aktarıldı: ${result.counts?.projects ?? 0} iş, ${result.counts?.transactions ?? 0} hareket`)
      if (fileRef.current) fileRef.current.value = ""
    })

  const download = () =>
    start(async () => {
      const json = await exportData()
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `source-yedek-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Yedek indirildi")
    })

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Görünüm</h2>
          <p className="text-xs text-muted-foreground">Tema tercihiniz bu tarayıcıda saklanır.</p>
        </div>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm">Tema</span>
          <ThemeToggle />
        </div>
      </section>

      <NotificationSettings />

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Veri</h2>
          <p className="text-xs text-muted-foreground">
            Veriler sunucudaki <code className="font-mono">data/source.db</code> dosyasında tutulur.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-3 lg:grid-cols-7">
          {[
            ["İş", counts.projects],
            ["Alan adı", counts.domains],
            ["Görev", counts.tasks],
            ["Not", counts.notes],
            ["Ödeme", counts.payments],
            ["Hareket", counts.transactions],
            ["Hedef", counts.goals],
          ].map(([label, n]) => (
            <div key={String(label)} className="bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{n}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-2 px-4 py-4">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={download} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            JSON yedek al
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload className="size-4" /> Yedekten geri yükle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setClearOpen(true)}
            disabled={total === 0}
          >
            <Trash2 className="size-4" /> Tüm veriyi sil
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Para birimi ve kurlar</p>
            <p>
              Her kayıt girildiği para biriminde saklanır ve o günün kuruyla TL karşılığı da tutulur. Üst bardaki
              para birimi seçimi tüm toplamları, grafikleri ve listeleri seçtiğiniz birime çevirir. Kurlar günlük
              olarak çekilir; geçmiş kayıtlar girildikleri günün kuruyla hesaplanır.
            </p>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        onConfirm={() => clearAllData()}
        title="Tüm veri silinsin mi?"
        description="Müşteriler, projeler, görevler, notlar, ödemeler ve finans kayıtlarının tamamı kalıcı olarak silinir. Önce yedek almanız önerilir."
        confirmLabel="Hepsini sil"
        successMessage="Tüm veriler silindi"
      />
    </div>
  )
}
