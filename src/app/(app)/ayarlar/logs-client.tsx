"use client"

import { AlertTriangle, ScrollText } from "lucide-react"
import * as React from "react"
import type { AuditEntry, ErrorEntry } from "@/db/schema"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const ACTION_LABELS: Record<string, string> = {
  login: "giriş",
  logout: "çıkış",
  login_failed: "başarısız giriş",
  login_2fa_failed: "hatalı 2FA kodu",
  "2fa_enabled": "2FA açıldı",
  "2fa_disabled": "2FA kapatıldı",
  session_revoked: "oturum kapatıldı",
  sessions_revoked_all: "diğer oturumlar kapatıldı",
  create: "oluşturuldu",
  update: "güncellendi",
  delete: "silindi",
  init: "kuruldu",
  clear: "temizlendi",
  import: "içe aktarıldı",
}

const ENTITY_LABELS: Record<string, string> = {
  auth: "kimlik",
  vault_item: "kasa kaydı",
  project: "iş",
  goal: "hedef",
  transaction: "hareket",
  payment: "ödeme",
  vault: "kasa",
  database: "veritabanı",
}

export function LogsSection({ audit, errors }: { audit: AuditEntry[]; errors: ErrorEntry[] }) {
  const [tab, setTab] = React.useState<"audit" | "errors">("audit")
  const failed = audit.filter((a) => a.action.includes("failed")).length

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Kayıtlar</h2>
          <p className="text-xs text-muted-foreground">
            {audit.length} denetim · {errors.length} hata
            {failed > 0 ? ` · ${failed} başarısız giriş` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {[
            { value: "audit" as const, label: "Denetim" },
            { value: "errors" as const, label: "Hatalar" },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                tab === t.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "audit" ? (
        audit.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Kayıt yok.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto scrollbar-thin">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                <ScrollText
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    a.action.includes("failed") ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {ENTITY_LABELS[a.entity] ?? a.entity} {ACTION_LABELS[a.action] ?? a.action}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                    {a.ip ? ` · ${a.ip}` : ""}
                    {a.summary ? ` · ${a.summary}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : errors.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Hata kaydı yok — iyi haber.</p>
      ) : (
        <ul className="max-h-80 divide-y overflow-y-auto scrollbar-thin">
          {errors.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{e.message}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(e.createdAt)}
                  {e.context ? ` · ${e.context}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Denetim kayıtları 180, hata kayıtları 60 gün saklanır. Harici bir servise gönderilmez;{" "}
        <code className="font-mono">SENTRY_DSN</code> ortam değişkeni tanımlanırsa hatalar oraya da iletilir.
      </p>
    </section>
  )
}
