"use client"

import type { Task } from "@/db/schema"
import { saveTask } from "@/lib/actions/tasks"
import { PRIORITY, TASK_STATUS } from "@/lib/constants"
import { AreaField, DateField, FormGrid, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"
import { ReminderField } from "./reminder-field"
import type { Lookup } from "./project-dialog"

export function TaskDialog({
  task,
  projects,
  trigger,
  open,
  onOpenChange,
  defaultDate,
  defaultProjectId,
}: {
  task?: Task
  projects: Lookup[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  defaultDate?: string
  defaultProjectId?: string
}) {
  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Görevi düzenle" : "Yeni görev"}
      action={saveTask}
      successMessage={task ? "Görev güncellendi" : "Görev eklendi"}
      width="sm"
    >
      {task && <input type="hidden" name="id" value={task.id} />}
      <div className="space-y-4">
        <TextField name="title" label="Başlık" required defaultValue={task?.title} placeholder="API endpoint'lerini yaz" autoFocus />
        <FormGrid>
          <SelectField name="status" label="Durum" options={TASK_STATUS} defaultValue={task?.status ?? "todo"} />
          <SelectField name="priority" label="Öncelik" options={PRIORITY} defaultValue={task?.priority ?? "medium"} />
          <DateField name="dueDate" label="Tarih" defaultValue={task?.dueDate ?? defaultDate} />
          <TextField name="estimateMinutes" label="Tahmini süre (dk)" type="number" min={0} step={15} defaultValue={task?.estimateMinutes ?? ""} />
          <SelectField
            name="projectId"
            label="Proje"
            options={projects}
            defaultValue={task?.projectId ?? defaultProjectId ?? "none"}
            allowEmpty
            emptyLabel="Projesiz"
            full
          />
          <ReminderField defaultValue={task?.remindAt} />
        </FormGrid>
        <AreaField name="description" label="Detay" rows={3} defaultValue={task?.description ?? ""} />
      </div>
    </FormDialog>
  )
}
