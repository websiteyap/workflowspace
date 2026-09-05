"use client"

import { CalendarDays, FolderKanban, ListChecks, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { ProjectDialog, type Lookup } from "@/components/forms/project-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
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
import { Progress } from "@/components/ui/progress"
import type { Project } from "@/db/schema"
import { useNewParam } from "@/hooks/use-new-param"
import { deleteProjectById, updateProjectStatus } from "@/lib/actions/projects"
import { PRIORITY, PROJECT_STATUS } from "@/lib/constants"
import { money, relativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"

export type ProjectRow = Project & {
  clientName: string | null
  openTasks: number
  doneTasks: number
  earned: number
}

const FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Devam eden" },
  { value: "planned", label: "Planlanan" },
  { value: "paused", label: "Beklemede" },
  { value: "completed", label: "Biten" },
]

function ProjectCard({ project, clients }: { project: ProjectRow; clients: Lookup[] }) {
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [, start] = React.useTransition()
  const budgetPct = project.budget ? Math.min(100, Math.round((project.earned / project.budget) * 100)) : null

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/projeler/${project.id}`} className="block truncate font-medium hover:underline">
            {project.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{project.clientName ?? "İç proje"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">İşlemler</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/projeler/${project.id}`}>Detay</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEdit(true)}>
              <Pencil className="size-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {PROJECT_STATUS.filter((s) => s.value !== project.status).map((s) => (
              <DropdownMenuItem key={s.value} onSelect={() => start(() => updateProjectStatus(project.id, s.value))}>
                {s.label} olarak işaretle
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
              <Trash2 className="size-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge options={PROJECT_STATUS} value={project.status} />
        {(project.priority === "high" || project.priority === "urgent") && (
          <StatusBadge options={PRIORITY} value={project.priority} />
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>İlerleme</span>
          <span className="tabular">%{project.progress}</span>
        </div>
        <Progress value={project.progress} className="h-1.5" />
      </div>

      {project.budget ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tahsilat</span>
            <span className="tabular">
              <span className="font-medium">{money(project.earned, project.currency)}</span>
              <span className="text-muted-foreground"> / {money(project.budget, project.currency)}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[var(--viz-1)]" style={{ width: `${budgetPct ?? 0}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Tahsilat: <span className="tabular font-medium text-foreground">{money(project.earned, project.currency)}</span>
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5" />
          {project.openTasks} açık · {project.doneTasks} biten
        </span>
        {project.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              project.status !== "completed" &&
                new Date(project.dueDate) < new Date() &&
                "text-red-600 dark:text-red-400",
            )}
          >
            <CalendarDays className="size-3.5" />
            {relativeDay(project.dueDate)}
          </span>
        )}
      </div>

      <ProjectDialog project={project} clients={clients} open={edit} onOpenChange={setEdit} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deleteProjectById(project.id)}
        title={`${project.name} silinsin mi?`}
        description="Projeye bağlı görevler de silinir. Ödeme ve finans kayıtları projesiz olarak korunur."
      />
    </div>
  )
}

export function ProjectsClient({ projects, clients }: { projects: ProjectRow[]; clients: Lookup[] }) {
  const [newOpen, setNewOpen] = useNewParam("project")
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState("all")

  const filtered = projects.filter((p) => {
    if (status !== "all" && p.status !== status) return false
    if (q && !`${p.name} ${p.clientName ?? ""} ${p.stack ?? ""} ${p.tags ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      return false
    return true
  })

  const activeBudget = projects
    .filter((p) => p.status === "active")
    .reduce((a, p) => a + (p.budget ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projeler"
        description={`${projects.length} proje · aktif portföy ${money(activeBudget)}`}
        actions={
          <ProjectDialog
            clients={clients}
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni proje
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Proje, müşteri veya teknoloji ara…"
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
          title={projects.length === 0 ? "Henüz proje yok" : "Eşleşen proje bulunamadı"}
          description={
            projects.length === 0
              ? "Bir proje oluşturun; görevler, ödemeler ve gelir kayıtları bu projeye bağlanabilir."
              : "Filtreyi değiştirmeyi deneyin."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} clients={clients} />
          ))}
        </div>
      )}
    </div>
  )
}
