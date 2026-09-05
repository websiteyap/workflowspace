"use client"

import { saveClient } from "@/lib/actions/clients"
import { CLIENT_STATUS } from "@/lib/constants"
import { CURRENCIES } from "@/lib/format"
import { minorToInput } from "@/lib/format"
import type { Client } from "@/db/schema"
import { AreaField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export function ClientDialog({
  client,
  trigger,
  open,
  onOpenChange,
}: {
  client?: Client
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={client ? "Müşteriyi düzenle" : "Yeni müşteri"}
      description="İletişim ve faturalama bilgilerini buradan yönetin."
      action={saveClient}
      successMessage={client ? "Müşteri güncellendi" : "Müşteri eklendi"}
    >
      {client && <input type="hidden" name="id" value={client.id} />}
      <FormGrid>
        <TextField name="name" label="Ad Soyad / Ünvan" required defaultValue={client?.name} placeholder="Acme Yazılım A.Ş." />
        <TextField name="company" label="Firma" defaultValue={client?.company ?? ""} placeholder="Acme" />
        <SelectField name="status" label="Durum" options={CLIENT_STATUS} defaultValue={client?.status ?? "active"} />
        <SelectField
          name="currency"
          label="Para birimi"
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          defaultValue={client?.currency ?? "TRY"}
        />
        <TextField name="email" label="E-posta" type="email" defaultValue={client?.email ?? ""} placeholder="info@acme.com" />
        <TextField name="phone" label="Telefon" defaultValue={client?.phone ?? ""} placeholder="+90 555 000 00 00" />
        <TextField name="website" label="Web sitesi" defaultValue={client?.website ?? ""} placeholder="acme.com" />
        <MoneyField
          name="hourlyRate"
          label="Saatlik ücret"
          currency={client?.currency ?? "TRY"}
          defaultValue={minorToInput(client?.hourlyRate)}
        />
        <TextField name="taxOffice" label="Vergi dairesi" defaultValue={client?.taxOffice ?? ""} />
        <TextField name="taxNumber" label="Vergi / TC no" defaultValue={client?.taxNumber ?? ""} />
        <AreaField name="address" label="Adres" rows={2} defaultValue={client?.address ?? ""} />
        <AreaField name="notes" label="Notlar" rows={3} defaultValue={client?.notes ?? ""} placeholder="Ödeme alışkanlıkları, tercih ettiği iletişim kanalı..." />
      </FormGrid>
    </FormDialog>
  )
}
