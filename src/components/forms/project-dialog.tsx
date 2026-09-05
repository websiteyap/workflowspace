"use client"

import * as React from "react"
import type { Project } from "@/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { saveProject } from "@/lib/actions/projects"
import { BILLING_CYCLE, PRIORITY, PROJECT_STATUS, REMINDER_DAYS } from "@/lib/constants"
import { CURRENCIES, minorToInput } from "@/lib/format"
import { AreaField, DateField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export type Lookup = { value: string; label: string }

export function ProjectDialog({
  project,
  trigger,
  open,
  onOpenChange,
}: {
  project?: Project
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  const [currency, setCurrency] = React.useState(project?.currency ?? "TRY")
  const [cycle, setCycle] = React.useState(project?.billingCycle ?? "monthly")

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "İşi düzenle" : "Yeni iş"}
      description="Müşteri, ücretlendirme, sunucu ve bakım bilgileri tek kayıtta."
      action={saveProject}
      successMessage={project ? "Güncellendi" : "Oluşturuldu"}
      width="lg"
    >
      {project && <input type="hidden" name="id" value={project.id} />}

      <Tabs defaultValue="genel">
        <TabsList className="w-full">
          <TabsTrigger value="genel" className="flex-1">
            Genel
          </TabsTrigger>
          <TabsTrigger value="ucret" className="flex-1">
            Ücretlendirme
          </TabsTrigger>
          <TabsTrigger value="teknik" className="flex-1">
            Sunucu &amp; Bakım
          </TabsTrigger>
        </TabsList>

        <TabsContent value="genel" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
          <FormGrid>
            <TextField
              name="name"
              label="Proje adı"
              required
              defaultValue={project?.name}
              placeholder="Kurumsal site & bakım"
            />
            <TextField
              name="clientName"
              label="Müşteri"
              defaultValue={project?.clientName ?? ""}
              placeholder="Elif Demir"
            />
            <TextField
              name="clientCompany"
              label="Firma"
              defaultValue={project?.clientCompany ?? ""}
              placeholder="Atlas Lojistik"
            />
            <SelectField name="status" label="Durum" options={PROJECT_STATUS} defaultValue={project?.status ?? "active"} />
            <TextField
              name="clientEmail"
              label="E-posta"
              type="email"
              defaultValue={project?.clientEmail ?? ""}
            />
            <TextField name="clientPhone" label="Telefon" defaultValue={project?.clientPhone ?? ""} />
            <SelectField name="priority" label="Öncelik" options={PRIORITY} defaultValue={project?.priority ?? "medium"} />
            <TextField
              name="progress"
              label="İlerleme (%)"
              type="number"
              min={0}
              max={100}
              defaultValue={project?.progress ?? 0}
            />
            <AreaField
              name="description"
              label="Proje notu"
              rows={3}
              defaultValue={project?.description ?? ""}
              placeholder="Kapsam, anlaşma detayları, dikkat edilecekler…"
            />
            <TextField name="tags" label="Etiketler" defaultValue={project?.tags ?? ""} placeholder="web, bakım" />
            <TextField
              name="stack"
              label="Teknolojiler"
              defaultValue={project?.stack ?? ""}
              placeholder="Next.js, Postgres"
            />
          </FormGrid>
        </TabsContent>

        <TabsContent value="ucret" forceMount className="mt-4 space-y-3 data-[state=inactive]:hidden">
          <FormGrid>
            <MoneyField
              name="price"
              label="Ücret"
              currency={currency}
              defaultValue={minorToInput(project?.price)}
              hint="Bir döngüde alınan tutar"
            />
            <SelectField
              name="currency"
              label="Para birimi"
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              defaultValue={currency}
              onValueChange={setCurrency}
            />
            <SelectField
              name="billingCycle"
              label="Döngü"
              options={BILLING_CYCLE}
              defaultValue={cycle}
              onValueChange={setCycle}
            />
            <DateField name="startDate" label="Başlangıç tarihi" defaultValue={project?.startDate} />
            <SelectField
              name="reminderDaysBefore"
              label="Ödeme hatırlatması"
              options={REMINDER_DAYS}
              defaultValue={String(project?.reminderDaysBefore ?? 7)}
              hint="Sonraki ödeme tarihi başlangıç + döngüden otomatik hesaplanır"
            />
            <DateField name="dueDate" label="Teslim tarihi" defaultValue={project?.dueDate} />
          </FormGrid>
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Ek maliyet ve ek ücretleri kayıt oluştuktan sonra proje detayından ekleyebilir, her birini
            &quot;döngüye dahil&quot; olarak işaretleyebilirsin.
          </p>
        </TabsContent>

        <TabsContent value="teknik" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
          <FormGrid>
            <TextField
              name="serverProvider"
              label="Sunucu sağlayıcı"
              defaultValue={project?.serverProvider ?? ""}
              placeholder="Hetzner, Contabo…"
            />
            <TextField
              name="serverIp"
              label="Sunucu IP"
              defaultValue={project?.serverIp ?? ""}
              placeholder="72.61.153.33"
            />
            <TextField
              name="cloudflareAccount"
              label="Cloudflare hesabı"
              defaultValue={project?.cloudflareAccount ?? ""}
              placeholder="hesap e-postası"
            />
            <DateField name="lastMaintenanceAt" label="Son bakım" defaultValue={project?.lastMaintenanceAt} />
            <TextField name="liveUrl" label="Canlı adres" defaultValue={project?.liveUrl ?? ""} />
            <TextField name="repoUrl" label="Repo" defaultValue={project?.repoUrl ?? ""} />
            <AreaField
              name="backupInfo"
              label="Yedek bilgisi"
              rows={2}
              defaultValue={project?.backupInfo ?? ""}
              placeholder="Nerede, hangi sıklıkta, nasıl geri yüklenir"
            />
            <AreaField
              name="serverNotes"
              label="Sunucu notları"
              rows={2}
              defaultValue={project?.serverNotes ?? ""}
              placeholder="Panel adresi, servis adları, özel ayarlar"
            />
          </FormGrid>
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Alan adlarını kayıt oluştuktan sonra proje detayından ekleyebilirsin; süre bitiş tarihi girersen
            yaklaşanlar panelde uyarı olarak çıkar.
          </p>
        </TabsContent>
      </Tabs>
    </FormDialog>
  )
}
