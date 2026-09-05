"use client"

import type { Note } from "@/db/schema"
import { saveNote } from "@/lib/actions/notes"
import { AreaField, FormGrid, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"
import type { Lookup } from "./project-dialog"

export function NoteDialog({
  note,
  projects,
  trigger,
  open,
  onOpenChange,
}: {
  note?: Note
  projects: Lookup[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={note ? "Notu düzenle" : "Yeni not"}
      action={saveNote}
      successMessage={note ? "Not güncellendi" : "Not eklendi"}
      width="lg"
    >
      {note && <input type="hidden" name="id" value={note.id} />}
      <div className="space-y-4">
        <TextField name="title" label="Başlık" required defaultValue={note?.title} placeholder="Toplantı notları — 12 Mart" autoFocus />
        <AreaField
          name="content"
          label="İçerik"
          rows={12}
          defaultValue={note?.content ?? ""}
          placeholder={"Markdown yazabilirsiniz:\n\n# Başlık\n- madde\n`kod`"}
          className="font-mono text-[13px] leading-relaxed"
        />
        <FormGrid>
          <SelectField name="projectId" label="Proje" options={projects} defaultValue={note?.projectId ?? "none"} allowEmpty emptyLabel="Yok" />
          <TextField name="tags" label="Etiketler" defaultValue={note?.tags ?? ""} placeholder="fikir, sql, toplantı" full />
        </FormGrid>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pinned" defaultChecked={note?.pinned === 1} className="size-4 accent-foreground" />
          Panoya sabitle
        </label>
      </div>
    </FormDialog>
  )
}
