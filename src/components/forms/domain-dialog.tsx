"use client"

import * as React from "react"
import type { ProjectDomain } from "@/db/schema"
import { saveDomain } from "@/lib/actions/projects"
import { AreaField, DateField, FormGrid, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export function DomainDialog({
  projectId,
  domain,
  trigger,
  open,
  onOpenChange,
}: {
  projectId: string
  domain?: ProjectDomain
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  const [isPrimary, setIsPrimary] = React.useState(domain?.isPrimary === 1)

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={domain ? "Alan adını düzenle" : "Alan adı ekle"}
      action={saveDomain}
      successMessage={domain ? "Güncellendi" : "Alan adı eklendi"}
      width="sm"
    >
      <input type="hidden" name="projectId" value={projectId} />
      {domain && <input type="hidden" name="id" value={domain.id} />}
      <input type="hidden" name="isPrimary" value={isPrimary ? "on" : ""} />

      <div className="space-y-4">
        <TextField name="host" label="Alan adı" required defaultValue={domain?.host} placeholder="ornek.com" />
        <FormGrid>
          <TextField
            name="registrar"
            label="Kayıt firması"
            defaultValue={domain?.registrar ?? ""}
            placeholder="Cloudflare, Natro…"
          />
          <DateField name="expiresAt" label="Bitiş tarihi" defaultValue={domain?.expiresAt} />
        </FormGrid>
        <AreaField name="notes" label="Not" rows={2} defaultValue={domain?.notes ?? ""} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="size-4 accent-foreground"
          />
          Birincil alan adı
        </label>
      </div>
    </FormDialog>
  )
}
