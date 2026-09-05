"use client"

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { PaymentDialog } from "@/components/forms/payment-dialog"
import type { Lookup } from "@/components/forms/project-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Payment } from "@/db/schema"
import { useNewParam } from "@/hooks/use-new-param"
import { deletePayment, markPaymentPaid, unmarkPayment } from "@/lib/actions/finance"
import { PAYMENT_STATUS } from "@/lib/constants"
import { type RateMap, formatBase, formatDate, money, monthRange, relativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"

export type PaymentRow = Payment & {
  clientName: string | null
  projectName: string | null
  isOverdue: boolean
}

const FILTERS = [
  { value: "open", label: "Açık" },
  { value: "overdue", label: "Geciken" },
  { value: "paid", label: "Ödenen" },
  { value: "all", label: "Tümü" },
]

function RowActions({ payment, projects }: { payment: PaymentRow; projects: Lookup[] }) {
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [, start] = React.useTransition()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded p-1.5 text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">İşlemler</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {payment.status !== "paid" ? (
            <DropdownMenuItem onSelect={() => start(() => markPaymentPaid(payment.id))}>
              <Check className="size-4" /> Ödendi işaretle
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => start(() => unmarkPayment(payment.id))}>
              <RotateCcw className="size-4" /> Ödemeyi geri al
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil className="size-4" /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
            <Trash2 className="size-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PaymentDialog payment={payment} projects={projects} open={edit} onOpenChange={setEdit} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deletePayment(payment.id)}
        title="Ödeme kaydı silinsin mi?"
        description={payment.title}
      />
    </>
  )
}

export function PaymentsClient({
  payments,
  projects,
  display,
  rates,
}: {
  payments: PaymentRow[]
  projects: Lookup[]
  display: string
  rates: RateMap
}) {
  const [newOpen, setNewOpen] = useNewParam("payment")
  const [q, setQ] = React.useState("")
  const [filter, setFilter] = React.useState("open")
  const [, start] = React.useTransition()

  const month = monthRange(0)
  const fmt = (v: number) => formatBase(v, display, rates)
  const pendingIn = payments
    .filter((p) => p.status === "pending" && p.direction === "incoming")
    .reduce((a, p) => a + p.baseAmount, 0)
  const overdue = payments.filter((p) => p.isOverdue)
  const pendingOut = payments
    .filter((p) => p.status === "pending" && p.direction === "outgoing")
    .reduce((a, p) => a + p.baseAmount, 0)
  const collectedThisMonth = payments
    .filter((p) => p.status === "paid" && p.direction === "incoming" && (p.paidDate ?? "") >= month.start && (p.paidDate ?? "") <= month.end)
    .reduce((a, p) => a + p.baseAmount, 0)

  const filtered = payments.filter((p) => {
    if (filter === "open" && p.status !== "pending") return false
    if (filter === "overdue" && !p.isOverdue) return false
    if (filter === "paid" && p.status !== "paid") return false
    if (q && !`${p.title} ${p.clientName ?? ""} ${p.projectName ?? ""} ${p.invoiceNo ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ödemeler"
        description="Tahsilat planı, vade takibi ve ödenecekler"
        actions={
          <PaymentDialog
            projects={projects}
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni ödeme
              </Button>
            }
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bekleyen tahsilat" value={fmt(pendingIn)} icon={ArrowDownLeft} hint="tahsil edilecek" />
        <StatCard
          label="Gecikmiş"
          value={fmt(overdue.reduce((a, p) => a + p.baseAmount, 0))}
          icon={AlertTriangle}
          accent={overdue.length ? "negative" : undefined}
          hint={`${overdue.length} kayıt`}
        />
        <StatCard label={`Tahsil edilen · ${month.label}`} value={fmt(collectedThisMonth)} icon={Check} accent="positive" />
        <StatCard label="Ödenecek" value={fmt(pendingOut)} icon={ArrowUpRight} hint="giden ödemeler" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Başlık, müşteri veya fatura no…"
          className="h-9 sm:max-w-xs"
        />
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={payments.length === 0 ? "Henüz ödeme kaydı yok" : "Bu filtrede kayıt yok"}
          description={
            payments.length === 0
              ? "Hakedişleri ve vade tarihlerini ekleyin; ödendi işaretlediğinizde gelir kaydı otomatik oluşur."
              : "Farklı bir filtre deneyin."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Başlık</TableHead>
                <TableHead className="hidden md:table-cell">Müşteri / Proje</TableHead>
                <TableHead>Vade</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-24 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className={cn(p.isOverdue && "bg-red-500/[0.03]")}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {p.direction === "incoming" ? (
                        <ArrowDownLeft className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-red-600 dark:text-red-400" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {p.invoiceNo && <span className="font-mono">#{p.invoiceNo}</span>}
                          {p.recurrence !== "none" && (
                            <span className="inline-flex items-center gap-0.5">
                              <Repeat className="size-3" /> tekrarlı
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {p.projectId ? (
                      <Link href={`/projeler/${p.projectId}`} className="hover:text-foreground hover:underline">
                        {p.projectName}
                      </Link>
                    ) : (
                      <span>—</span>
                    )}
                    {p.clientName && <span className="block truncate text-xs">{p.clientName}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className="tabular">{formatDate(p.dueDate)}</span>
                    {p.status === "pending" && (
                      <span className={cn("block text-xs", p.isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {relativeDay(p.dueDate)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular font-medium whitespace-nowrap">
                    {fmt(p.baseAmount)}
                    {p.currency !== display && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {money(p.amount, p.currency)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge options={PAYMENT_STATUS} value={p.isOverdue ? "overdue" : p.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {p.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => start(() => markPaymentPaid(p.id))}
                        >
                          <Check className="size-3.5" /> Ödendi
                        </Button>
                      )}
                      <RowActions payment={p} projects={projects} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
