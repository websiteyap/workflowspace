"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { ClientDialog } from "@/components/forms/client-dialog"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { PaymentDialog } from "@/components/forms/payment-dialog"
import { ProjectDialog, type Lookup } from "@/components/forms/project-dialog"
import { Button } from "@/components/ui/button"
import type { Client } from "@/db/schema"
import { deleteClientById } from "@/lib/actions/clients"

export function ClientHeaderActions({
  client,
  clients,
  projects,
}: {
  client: Client
  clients: Lookup[]
  projects: Lookup[]
}) {
  const router = useRouter()
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [project, setProject] = React.useState(false)
  const [payment, setPayment] = React.useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setProject(true)}>
        <Plus className="size-4" /> Proje
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPayment(true)}>
        <Plus className="size-4" /> Ödeme
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEdit(true)}>
        <Pencil className="size-4" /> Düzenle
      </Button>
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => setDel(true)}>
        <Trash2 className="size-4" />
        <span className="sr-only">Sil</span>
      </Button>

      <ClientDialog client={client} open={edit} onOpenChange={setEdit} />
      <ProjectDialog
        clients={clients}
        defaultClientId={client.id}
        open={project}
        onOpenChange={setProject}
      />
      <PaymentDialog
        clients={clients}
        projects={projects}
        defaultClientId={client.id}
        open={payment}
        onOpenChange={setPayment}
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={async () => {
          await deleteClientById(client.id)
          router.push("/musteriler")
        }}
        title={`${client.name} silinsin mi?`}
        description="Müşteri silinir; projeleri ve kayıtları müşterisiz olarak korunur."
      />
    </div>
  )
}
