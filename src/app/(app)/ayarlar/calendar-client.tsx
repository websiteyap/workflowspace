"use client"

import { CalendarDays, Check, Copy } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function CalendarSection({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false)

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="size-4" /> Takvim beslemesi
        </h2>
        <p className="text-xs text-muted-foreground">
          Görev tarihleri, ödeme vadeleri, teslimler ve domain bitişleri.
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        <code className="block break-all rounded-md border bg-muted px-2 py-1.5 font-mono text-[11px]">{url}</code>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            void navigator.clipboard.writeText(url)
            setCopied(true)
            toast.success("Adres kopyalandı")
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Kopyala
        </Button>
        <p className="text-xs text-muted-foreground">
          Google Takvim → Diğer takvimler → <strong>URL&apos;den abone ol</strong>. Apple Takvim → Dosya →{" "}
          <strong>Yeni Takvim Aboneliği</strong>. Bu adres gizli tutulmalı; bilen herkes takvimini görebilir.
        </p>
      </div>
    </section>
  )
}
