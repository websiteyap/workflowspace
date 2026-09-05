"use client"

import { BellOff, BellRing, CalendarClock, Hourglass, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { TaskDialog } from "@/components/forms/task-dialog"
import type { Lookup } from "@/components/forms/project-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Task } from "@/db/schema"
import { clearReminder, deleteTask, moveTaskDate, snoozeReminder, toggleTask } from "@/lib/actions/tasks"
import { PRIORITY } from "@/lib/constants"
import { addDays, duration, relativeDay, reminderLabel, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./status-badge"

export function TaskItem({
  task,
  projectName,
  projects,
  showDate = true,
  className,
}: {
  task: Task
  projectName?: string | null
  projects: Lookup[]
  showDate?: boolean
  className?: string
}) {
  const [pending, start] = React.useTransition()
  const [edit, setEdit] = React.useState(false)
  const done = task.status === "done"
  const overdue = !done && task.dueDate && task.dueDate < todayISO()

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50",
        pending && "opacity-50",
        className,
      )}
    >
      <Checkbox
        checked={done}
        disabled={pending}
        className="mt-0.5"
        onCheckedChange={(v) => start(() => toggleTask(task.id, v === true).then(() => {}))}
        aria-label={done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-5", done && "text-muted-foreground line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          {task.priority !== "medium" && <StatusBadge options={PRIORITY} value={task.priority} className="py-0" />}
          {projectName && <span className="truncate">{projectName}</span>}
          {showDate && task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-red-600 dark:text-red-400")}>
              <CalendarClock className="size-3" />
              {relativeDay(task.dueDate)}
            </span>
          )}
          {duration(task.estimateMinutes) && (
            <span className="inline-flex items-center gap-1" title="Tahmini süre">
              <Hourglass className="size-3" />
              {duration(task.estimateMinutes)}
            </span>
          )}
          {task.remindAt && !done && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                task.reminderFiredAt ? "text-muted-foreground/60" : "text-amber-600 dark:text-amber-400",
              )}
              title={task.reminderFiredAt ? "Hatırlatıldı" : "Hatırlatıcı kurulu"}
            >
              <BellRing className="size-3" />
              {reminderLabel(task.remindAt)}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Görev işlemleri</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil className="size-4" /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => start(() => moveTaskDate(task.id, todayISO()))}>
            Bugüne al
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => start(() => moveTaskDate(task.id, addDays(todayISO(), 1)))}>
            Yarına ertele
          </DropdownMenuItem>
          {task.remindAt ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => start(() => snoozeReminder(task.id, 10))}>
                <BellRing className="size-4" /> 10 dk sonra hatırlat
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => start(() => snoozeReminder(task.id, 60))}>
                <BellRing className="size-4" /> 1 saat sonra hatırlat
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => start(() => clearReminder(task.id))}>
                <BellOff className="size-4" /> Hatırlatıcıyı kaldır
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => start(() => snoozeReminder(task.id, 60))}>
                <BellRing className="size-4" /> 1 saat sonra hatırlat
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              start(async () => {
                await deleteTask(task.id)
                toast.success("Görev silindi")
              })
            }
          >
            <Trash2 className="size-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskDialog task={task} projects={projects} open={edit} onOpenChange={setEdit} />
    </div>
  )
}
