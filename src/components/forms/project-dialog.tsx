"use client"

import type { Project } from "@/db/schema"
import { saveProject } from "@/lib/actions/projects"
import { BILLING_TYPE, PRIORITY, PROJECT_STATUS } from "@/lib/constants"
import { CURRENCIES, minorToInput } from "@/lib/format"
import { AreaField, DateField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export type Lookup = { value: string; label: string }

export function ProjectDialog({
  project,
  clients,
  trigger,
  open,
  onOpenChange,
  defaultClientId,
}: {
  project?: Project
  clients: Lookup[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  defaultClientId?: string
}) {
  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "Projeyi düzenle" : "Yeni proje"}
      description="Kapsam, bütçe ve teslim tarihini tanımlayın."
      action={saveProject}
      successMessage={project ? "Proje güncellendi" : "Proje oluşturuldu"}
    >
      {project && <input type="hidden" name="id" value={project.id} />}
      <FormGrid>
        <TextField name="name" label="Proje adı" required full defaultValue={project?.name} placeholder="Kurumsal web sitesi" />
        <SelectField
          name="clientId"
          label="Müşteri"
          options={clients}
          defaultValue={project?.clientId ?? defaultClientId ?? "none"}
          allowEmpty
          emptyLabel="Müşteri yok (iç proje)"
        />
        <SelectField name="status" label="Durum" options={PROJECT_STATUS} defaultValue={project?.status ?? "active"} />
        <SelectField name="priority" label="Öncelik" options={PRIORITY} defaultValue={project?.priority ?? "medium"} />
        <SelectField name="billingType" label="Ücretlendirme" options={BILLING_TYPE} defaultValue={project?.billingType ?? "fixed"} />
        <MoneyField name="budget" label="Bütçe" currency={project?.currency ?? "TRY"} defaultValue={minorToInput(project?.budget)} />
        <MoneyField name="hourlyRate" label="Saatlik ücret" currency={project?.currency ?? "TRY"} defaultValue={minorToInput(project?.hourlyRate)} />
        <SelectField name="currency" label="Para birimi" options={CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={project?.currency ?? "TRY"} />
        <TextField name="progress" label="İlerleme (%)" type="number" min={0} max={100} defaultValue={project?.progress ?? 0} />
        <DateField name="startDate" label="Başlangıç" defaultValue={project?.startDate} />
        <DateField name="dueDate" label="Teslim tarihi" defaultValue={project?.dueDate} />
        <TextField name="stack" label="Teknolojiler" defaultValue={project?.stack ?? ""} placeholder="Next.js, Postgres, Stripe" />
        <TextField name="tags" label="Etiketler" defaultValue={project?.tags ?? ""} placeholder="web, bakım" />
        <TextField name="repoUrl" label="Repo" defaultValue={project?.repoUrl ?? ""} placeholder="github.com/..." />
        <TextField name="liveUrl" label="Canlı adres" defaultValue={project?.liveUrl ?? ""} placeholder="https://..." />
        <AreaField name="description" label="Açıklama" rows={3} defaultValue={project?.description ?? ""} />
      </FormGrid>
    </FormDialog>
  )
}
