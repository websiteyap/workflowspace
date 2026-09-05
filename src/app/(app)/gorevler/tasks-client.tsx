"use client"

import { CheckCircle2, ListChecks, Plus } from "lucide-react"
import * as React from "react"
import type { Lookup } from "@/components/forms/project-dialog"
import { TaskDialog } from "@/components/forms/task-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { QuickTask } from "@/components/shared/quick-task"
import { TaskItem } from "@/components/shared/task-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Task } from "@/db/schema"
import { useNewParam } from "@/hooks/use-new-param"
import { addDays, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"

type Row = Task & { projectName: string | null }

const GROUPS = [
  { key: "overdue", title: "Gecikmiş", tone: "text-red-600 dark:text-red-400" },
  { key: "today", title: "Bugün", tone: "" },
  { key: "tomorrow", title: "Yarın", tone: "" },
  { key: "week", title: "Bu hafta", tone: "" },
  { key: "later", title: "Daha sonra", tone: "" },
  { key: "someday", title: "Tarihsiz", tone: "" },
] as const

function bucket(task: Row, today: string, tomorrow: string, weekEnd: string) {
  if (!task.dueDate) return "someday"
  if (task.dueDate < today) return "overdue"
  if (task.dueDate === today) return "today"
  if (task.dueDate === tomorrow) return "tomorrow"
  if (task.dueDate <= weekEnd) return "week"
  return "later"
}

export function TasksClient({ tasks, projects }: { tasks: Row[]; projects: Lookup[] }) {
  const [newOpen, setNewOpen] = useNewParam("task")
  const [q, setQ] = React.useState("")
  const [project, setProject] = React.useState("all")
  const [showDone, setShowDone] = React.useState(false)

  const today = todayISO()
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 7)

  const filtered = tasks.filter((t) => {
    if (!showDone && t.status === "done") return false
    if (project !== "all" && t.projectId !== project) return false
    if (q && !`${t.title} ${t.description ?? ""} ${t.projectName ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      return false
    return true
  })

  const open = filtered.filter((t) => t.status !== "done")
  const done = filtered.filter((t) => t.status === "done")
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: open.filter((t) => bucket(t, today, tomorrow, weekEnd) === g.key),
  })).filter((g) => g.items.length > 0)

  const todayCount = tasks.filter((t) => t.dueDate === today && t.status !== "done").length
  const overdueCount = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Görevler"
        description={`${todayCount} görev bugün planlı${overdueCount ? ` · ${overdueCount} gecikmiş` : ""}`}
        actions={
          <TaskDialog
            projects={projects}
            open={newOpen}
            onOpenChange={setNewOpen}
            defaultDate={today}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni görev
              </Button>
            }
          />
        }
      />

      <div className="rounded-xl border bg-card p-3">
        <QuickTask dueDate={today} placeholder="Bugüne hızlı görev ekle — Enter ile kaydet" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Görevlerde ara…"
          className="h-9 sm:max-w-xs"
        />
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="h-9 w-full sm:w-56">
            <SelectValue placeholder="Proje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm projeler</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showDone ? "secondary" : "ghost"}
          size="sm"
          className="h-9 gap-1.5 sm:ml-auto"
          onClick={() => setShowDone((v) => !v)}
        >
          <CheckCircle2 className="size-4" />
          Tamamlananlar {done.length > 0 && `(${done.length})`}
        </Button>
      </div>

      {grouped.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Görev bulunamadı"
          description="Yukarıdaki hızlı ekleme alanından bugüne bir hedef yazabilir ya da detaylı görev oluşturabilirsiniz."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.key} className="space-y-1">
              <div className="flex items-center gap-2 px-2">
                <h2 className={cn("text-sm font-medium", g.tone)}>{g.title}</h2>
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{g.items.length}</span>
              </div>
              <div className="rounded-xl border bg-card p-1.5">
                {g.items.map((t) => (
                  <TaskItem key={t.id} task={t} projectName={t.projectName} projects={projects} />
                ))}
              </div>
            </section>
          ))}

          {showDone && done.length > 0 && (
            <section className="space-y-1">
              <div className="flex items-center gap-2 px-2">
                <h2 className="text-sm font-medium text-muted-foreground">Tamamlandı</h2>
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{done.length}</span>
              </div>
              <div className="rounded-xl border bg-card p-1.5">
                {done.slice(0, 50).map((t) => (
                  <TaskItem key={t.id} task={t} projectName={t.projectName} projects={projects} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
