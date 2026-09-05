"use client"

import type { Payment } from "@/db/schema"
import { savePayment } from "@/lib/actions/finance"
import { PAYMENT_DIRECTION, PAYMENT_METHODS, PAYMENT_STATUS, RECURRENCE } from "@/lib/constants"
import { CURRENCIES, minorToInput, todayISO } from "@/lib/format"
import { AreaField, DateField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"
import type { Lookup } from "./project-dialog"

export function PaymentDialog({
  payment,
  clients,
  projects,
  trigger,
  open,
  onOpenChange,
  defaultClientId,
  defaultProjectId,
}: {
  payment?: Payment
  clients: Lookup[]
  projects: Lookup[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  defaultClientId?: string
  defaultProjectId?: string
}) {
  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={payment ? "Ödemeyi düzenle" : "Yeni ödeme kaydı"}
      description="Vadesi gelen tahsilatları ve ödeyeceğiniz tutarları takip edin."
      action={savePayment}
      successMessage={payment ? "Ödeme güncellendi" : "Ödeme eklendi"}
    >
      {payment && <input type="hidden" name="id" value={payment.id} />}
      <FormGrid>
        <TextField name="title" label="Başlık" required full defaultValue={payment?.title} placeholder="1. hakediş — kurumsal site" />
        <SelectField name="direction" label="Tür" options={PAYMENT_DIRECTION} defaultValue={payment?.direction ?? "incoming"} />
        <SelectField name="status" label="Durum" options={PAYMENT_STATUS} defaultValue={payment?.status ?? "pending"} />
        <MoneyField name="amount" label="Tutar" required currency={payment?.currency ?? "TRY"} defaultValue={minorToInput(payment?.amount)} />
        <SelectField name="currency" label="Para birimi" options={CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={payment?.currency ?? "TRY"} />
        <DateField name="dueDate" label="Vade tarihi" required defaultValue={payment?.dueDate ?? todayISO()} />
        <DateField name="issueDate" label="Fatura tarihi" defaultValue={payment?.issueDate} />
        <SelectField name="clientId" label="Müşteri" options={clients} defaultValue={payment?.clientId ?? defaultClientId ?? "none"} allowEmpty emptyLabel="Yok" />
        <SelectField name="projectId" label="Proje" options={projects} defaultValue={payment?.projectId ?? defaultProjectId ?? "none"} allowEmpty emptyLabel="Yok" />
        <SelectField name="recurrence" label="Tekrar" options={RECURRENCE} defaultValue={payment?.recurrence ?? "none"} hint="Ödendi işaretlendiğinde bir sonraki dönem otomatik açılır." />
        <SelectField name="method" label="Ödeme yöntemi" options={PAYMENT_METHODS} defaultValue={payment?.method ?? "none"} allowEmpty emptyLabel="Belirtilmedi" />
        <TextField name="invoiceNo" label="Fatura no" defaultValue={payment?.invoiceNo ?? ""} />
        <DateField name="paidDate" label="Ödendiği tarih" defaultValue={payment?.paidDate} hint="Durum 'Ödendi' ise doldurulur." />
        <AreaField name="notes" label="Not" rows={2} defaultValue={payment?.notes ?? ""} />
      </FormGrid>
    </FormDialog>
  )
}
