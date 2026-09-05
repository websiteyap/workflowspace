"use client"

import { Building2, Mail, MoreHorizontal, Phone, Plus, Trash2, Users, Pencil } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { ClientDialog } from "@/components/forms/client-dialog"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Client } from "@/db/schema"
import { deleteClientById } from "@/lib/actions/clients"
import { CLIENT_STATUS } from "@/lib/constants"
import { initials, money } from "@/lib/format"
import { useNewParam } from "@/hooks/use-new-param"
import { cn } from "@/lib/utils"

export type ClientRow = Client & {
  projectCount: number
  activeProjects: number
  earned: number
  pending: number
}

const FILTERS = [{ value: "all", label: "Tümü" }, ...CLIENT_STATUS.map((s) => ({ value: s.value, label: s.label }))]

function RowActions({ client }: { client: Client }) {
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
          <DropdownMenuItem asChild>
            <Link href={`/musteriler/${client.id}`}>Detay</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil className="size-4" /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
            <Trash2 className="size-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClientDialog client={client} open={edit} onOpenChange={setEdit} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deleteClientById(client.id)}
        title={`${client.name} silinsin mi?`}
        description="Müşteri silinir; projeleri ve kayıtları müşterisiz olarak korunur."
      />
    </>
  )
}

export function ClientsClient({ clients }: { clients: ClientRow[] }) {
  const [newOpen, setNewOpen] = useNewParam("client")
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState("all")

  const filtered = clients.filter((c) => {
    if (status !== "all" && c.status !== status) return false
    if (q && !`${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const totals = filtered.reduce(
    (a, c) => ({ earned: a.earned + c.earned, pending: a.pending + c.pending }),
    { earned: 0, pending: 0 },
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteriler"
        description={`${clients.length} kayıt · ${money(totals.earned)} toplam tahsilat · ${money(totals.pending)} bekleyen`}
        actions={
          <ClientDialog
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni müşteri
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim, firma veya e-posta ara…"
          className="h-9 sm:max-w-xs"
        />
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                status === f.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? "Henüz müşteri yok" : "Eşleşen müşteri bulunamadı"}
          description={
            clients.length === 0
              ? "İlk müşterinizi ekleyin; projeler, ödemeler ve gelir kayıtları bu karta bağlanacak."
              : "Arama veya filtreyi değiştirmeyi deneyin."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Müşteri</TableHead>
                <TableHead className="hidden md:table-cell">İletişim</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Proje</TableHead>
                <TableHead className="text-right">Tahsilat</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Bekleyen</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link href={`/musteriler/${c.id}`} className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:underline">{c.name}</span>
                        {c.company && (
                          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Building2 className="size-3" />
                            {c.company}
                          </span>
                        )}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-foreground">
                          <Mail className="size-3" /> {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground">
                          <Phone className="size-3" /> {c.phone}
                        </a>
                      )}
                      {!c.email && !c.phone && <span>—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge options={CLIENT_STATUS} value={c.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular text-sm">
                    {c.activeProjects}/{c.projectCount}
                  </TableCell>
                  <TableCell className="text-right tabular text-sm font-medium">{money(c.earned, c.currency)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular text-sm text-muted-foreground">
                    {c.pending > 0 ? money(c.pending, c.currency) : "—"}
                  </TableCell>
                  <TableCell>
                    <RowActions client={c} />
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
