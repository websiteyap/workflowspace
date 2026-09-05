"use client"

import { Database, Download, Loader2, Sparkles, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { NotificationSettings } from "@/components/reminders/notification-settings"
import { Button } from "@/components/ui/button"
import { clearAllData, exportData, seedDemoData } from "@/lib/actions/data"

export function DataTools({ counts }: { counts: Record<string, number> }) {
  const [seedOpen, setSeedOpen] = React.useState(false)
  const [clearOpen, setClearOpen] = React.useState(false)
  const [busy, start] = React.useTransition()

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
            Tüm veriler bilgisayarınızdaki <code className="font-mono">data/source.db</code> dosyasında tutulur.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Müşteri", counts.clients],
            ["Proje", counts.projects],
            ["Görev", counts.tasks],
            ["Not", counts.notes],
            ["Ödeme", counts.payments],
            ["Hareket", counts.transactions],
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
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSeedOpen(true)}>
            <Sparkles className="size-4" /> Demo verisi yükle
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
            <p className="font-medium text-foreground">Para birimi hakkında</p>
            <p>
              Her kayıt kendi para biriminde saklanır, ancak özet ve grafiklerdeki toplamlar kur çevrimi yapmadan
              hesaplanır. Farklı para birimlerini karıştırmadan önce tek bir raporlama para birimi kullanmanız önerilir.
            </p>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={seedOpen}
        onOpenChange={setSeedOpen}
        onConfirm={() => seedDemoData()}
        title="Demo verisi yüklensin mi?"
        description="Mevcut tüm kayıtlar silinir ve yerine örnek müşteri, proje, görev, not, ödeme ve finans kayıtları eklenir."
        confirmLabel="Yükle"
        successMessage="Demo verisi yüklendi"
      />
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
