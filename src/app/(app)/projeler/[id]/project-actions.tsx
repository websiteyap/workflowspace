"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { NoteDialog } from "@/components/forms/note-dialog"
import { PaymentDialog } from "@/components/forms/payment-dialog"
import { ProjectDialog, type Lookup } from "@/components/forms/project-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Project } from "@/db/schema"
import { deleteProjectById, updateProjectStatus } from "@/lib/actions/projects"
import { PROJECT_STATUS } from "@/lib/constants"

export function ProjectHeaderActions({
  project,
  clients,
  projects,
}: {
  project: Project
  clients: Lookup[]
  projects: Lookup[]
}) {
  const router = useRouter()
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [payment, setPayment] = React.useState(false)
  const [note, setNote] = React.useState(false)
  const [, start] = React.useTransition()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Durum: {PROJECT_STATUS.find((s) => s.value === project.status)?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {PROJECT_STATUS.map((s) => (
            <DropdownMenuItem key={s.value} onSelect={() => start(() => updateProjectStatus(project.id, s.value))}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPayment(true)}>
        <Plus className="size-4" /> Ödeme
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNote(true)}>
        <Plus className="size-4" /> Not
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEdit(true)}>
        <Pencil className="size-4" /> Düzenle
      </Button>
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => setDel(true)}>
        <Trash2 className="size-4" />
        <span className="sr-only">Sil</span>
      </Button>

      <ProjectDialog project={project} clients={clients} open={edit} onOpenChange={setEdit} />
      <PaymentDialog
        clients={clients}
        projects={projects}
        defaultProjectId={project.id}
        defaultClientId={project.clientId ?? undefined}
        open={payment}
        onOpenChange={setPayment}
      />
      <NoteDialog projects={projects} clients={clients} open={note} onOpenChange={setNote} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={async () => {
          await deleteProjectById(project.id)
          router.push("/projeler")
        }}
        title={`${project.name} silinsin mi?`}
        description="Projeye bağlı görevler de silinir. Ödeme ve finans kayıtları projesiz olarak korunur."
      />
    </div>
  )
}
