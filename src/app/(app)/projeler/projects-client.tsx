"use client"

import {
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { ProjectDialog } from "@/components/forms/project-dialog"
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
import { useNewParam } from "@/hooks/use-new-param"
import { BILLING_CYCLE, PROJECT_STATUS, label as labelOf } from "@/lib/constants"
import { deleteProjectById } from "@/lib/actions/projects"
import type { ProjectOverviewRow } from "@/lib/queries"
import { type RateMap, formatBase, relativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"

const FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "lead", label: "Teklif" },
  { value: "paused", label: "Beklemede" },
  { value: "completed", label: "Biten" },
]

function ProjectCard({
  project,
  display,
  rates,
}: {
  project: ProjectOverviewRow
  display: string
  rates: RateMap
}) {
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const fmt = (v: number | null | undefined) => formatBase(v, display, rates)
  const recurring = (project.billingCycle ?? "none") !== "none"

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/projeler/${project.id}`} className="block truncate font-medium hover:underline">
            {project.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {project.clientName ?? "Müşteri girilmedi"}
            {project.clientCompany ? ` · ${project.clientCompany}` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">İşlemler</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/projeler/${project.id}`}>Detay</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEdit(true)}>
              <Pencil className="size-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
              <Trash2 className="size-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge options={PROJECT_STATUS} value={project.status} />
        {recurring && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3" />
            {labelOf(BILLING_CYCLE, project.billingCycle)}
          </span>
        )}
        {project.paymentDue && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
            <AlertTriangle className="size-3" />
            Ödeme zamanı
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{recurring ? "Döngü ücreti" : "Ücret"}</dt>
          <dd className="mt-0.5 font-medium tabular">{fmt(project.cycleRevenue)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Aylık net</dt>
          <dd
            className={cn(
              "mt-0.5 font-medium tabular",
              project.monthlyNet < 0 && "text-red-600 dark:text-red-400",
            )}
          >
            {recurring ? fmt(project.monthlyNet) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Tahsil edilen</dt>
          <dd className="mt-0.5 tabular text-emerald-600 dark:text-emerald-400">{fmt(project.earned)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Gider</dt>
          <dd className="mt-0.5 tabular">{fmt(project.spent)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        {project.nextPaymentDate && recurring && (
          <span className={cn("inline-flex items-center gap-1", project.paymentDue && "text-red-600 dark:text-red-400")}>
            <CalendarClock className="size-3.5" />
            {relativeDay(project.nextPaymentDate)}
          </span>
        )}
        {project.primaryDomain && (
          <span className="inline-flex items-center gap-1 truncate">
            <Globe className="size-3.5" />
            {project.primaryDomain}
            {project.domainCount > 1 ? ` +${project.domainCount - 1}` : ""}
          </span>
        )}
        {project.serverIp && (
          <span className="inline-flex items-center gap-1">
            <Server className="size-3.5" />
            {project.serverIp}
          </span>
        )}
      </div>

      <ProjectDialog project={project} open={edit} onOpenChange={setEdit} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deleteProjectById(project.id)}
        title={`${project.name} silinsin mi?`}
        description="Bu işe bağlı görevler, ek kalemler ve alan adları da silinir."
      />
    </div>
  )
}

export function ProjectsClient({
  projects,
  display,
  rates,
}: {
  projects: ProjectOverviewRow[]
  display: string
  rates: RateMap
}) {
  const [newOpen, setNewOpen] = useNewParam("project")
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState("all")

  const filtered = projects.filter((p) => {
    if (status !== "all" && p.status !== status) return false
    if (
      q &&
      !`${p.name} ${p.clientName ?? ""} ${p.clientCompany ?? ""} ${p.primaryDomain ?? ""} ${p.stack ?? ""} ${p.tags ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false
    return true
  })

  const active = projects.filter((p) => p.status === "active")
  const mrr = active.reduce((a, p) => a + p.monthlyRevenue, 0)
  const monthlyCost = active.reduce((a, p) => a + (p.recurringCosts || 0), 0)
  const dueSoon = active.filter((p) => p.paymentDue).length
  const fmt = (v: number) => formatBase(v, display, rates)

  return (
    <div className="space-y-6">
      <PageHeader
        title="İşler"
        description={`${projects.length} kayıt · ${active.length} aktif`}
        actions={
          <ProjectDialog
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni iş
              </Button>
            }
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aylık düzenli gelir" value={fmt(mrr)} hint="aktif işlerin aylık karşılığı" />
        <StatCard label="Aylık düzenli gider" value={fmt(monthlyCost)} hint="döngüye dahil maliyetler" />
        <StatCard
          label="Aylık net"
          value={fmt(mrr - monthlyCost)}
          accent={mrr - monthlyCost >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Ödemesi gelen"
          value={String(dueSoon)}
          accent={dueSoon > 0 ? "negative" : undefined}
          hint="tahsil edilmeyi bekleyen"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Proje, müşteri, domain veya teknoloji ara…"
          className="h-9 sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-1 rounded-lg border p-0.5">
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
          icon={FolderKanban}
          title={projects.length === 0 ? "Henüz iş kaydı yok" : "Eşleşen kayıt yok"}
          description={
            projects.length === 0
              ? "Bir iş oluştur: müşteri adı, ücreti, ödeme döngüsü ve sunucu bilgileri tek kartta toplanır."
              : "Arama veya filtreyi değiştirmeyi dene."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} display={display} rates={rates} />
          ))}
        </div>
      )}
    </div>
  )
}
