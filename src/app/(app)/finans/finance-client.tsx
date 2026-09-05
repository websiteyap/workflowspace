"use client"

import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from "lucide-react"
import * as React from "react"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import type { Lookup } from "@/components/forms/project-dialog"
import { TransactionDialog } from "@/components/forms/transaction-dialog"
import { EmptyState } from "@/components/shared/empty-state"
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
import type { Transaction } from "@/db/schema"
import { useNewParam } from "@/hooks/use-new-param"
import { deleteTransaction } from "@/lib/actions/finance"
import { ALL_CATEGORIES, label as labelOf } from "@/lib/constants"
import { type RateMap, formatBase, formatDate, money } from "@/lib/format"
import { cn } from "@/lib/utils"

export type TxRow = Transaction & { projectName: string | null }

function RowActions({ tx, projects }: { tx: TxRow; projects: Lookup[] }) {
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded p-1.5 text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">İşlemler</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil className="size-4" /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
            <Trash2 className="size-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TransactionDialog transaction={tx} projects={projects} open={edit} onOpenChange={setEdit} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deleteTransaction(tx.id)}
        title="Kayıt silinsin mi?"
        description={tx.description ?? labelOf(ALL_CATEGORIES, tx.category)}
      />
    </>
  )
}

export function NewTransactionButton({ projects }: { projects: Lookup[] }) {
  const [open, setOpen] = useNewParam("transaction")
  return (
    <TransactionDialog
      projects={projects}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Yeni kayıt
        </Button>
      }
    />
  )
}

export function TransactionsTable({
  transactions,
  projects,
  display,
  rates,
}: {
  transactions: TxRow[]
  projects: Lookup[]
  display: string
  rates: RateMap
}) {
  const [q, setQ] = React.useState("")
  const [type, setType] = React.useState("all")

  const filtered = transactions.filter((t) => {
    if (type !== "all" && t.type !== type) return false
    if (
      q &&
      !`${t.description ?? ""} ${t.projectName ?? ""} ${labelOf(ALL_CATEGORIES, t.category)}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false
    return true
  })

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <h2 className="text-sm font-medium">Hareketler</h2>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hareketlerde ara…"
            className="h-9 sm:max-w-xs"
          />
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {[
              { value: "all", label: "Tümü" },
              { value: "income", label: "Gelir" },
              { value: "expense", label: "Gider" },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setType(f.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  type === f.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={transactions.length === 0 ? "Bu dönemde hareket yok" : "Eşleşen kayıt yok"}
          description={
            transactions.length === 0
              ? "Gelir ve giderlerinizi ekledikçe nakit akışı grafiği ve kategori dağılımı otomatik oluşur."
              : "Arama veya filtreyi değiştirin."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28">Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="hidden md:table-cell">Kategori</TableHead>
                <TableHead className="hidden lg:table-cell">İlişki</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap tabular text-sm text-muted-foreground">
                    {formatDate(t.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.type === "income" ? (
                        <ArrowDownLeft className="size-3.5 shrink-0 text-[var(--viz-1)]" />
                      ) : (
                        <ArrowUpRight className="size-3.5 shrink-0 text-[var(--viz-2)]" />
                      )}
                      <span className="truncate text-sm">
                        {t.description || labelOf(ALL_CATEGORIES, t.category)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {labelOf(ALL_CATEGORIES, t.category)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    <span className="block truncate">{t.projectName ?? "—"}</span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap text-right tabular font-medium",
                      t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "",
                    )}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatBase(t.baseAmount, display, rates)}
                    {t.currency !== display && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {money(t.amount, t.currency)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RowActions tx={t} projects={projects} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
