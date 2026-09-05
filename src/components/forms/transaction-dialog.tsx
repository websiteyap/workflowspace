"use client"

import * as React from "react"
import type { Transaction } from "@/db/schema"
import { saveTransaction } from "@/lib/actions/finance"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants"
import { CURRENCIES, minorToInput, todayISO } from "@/lib/format"
import { AreaField, DateField, FormGrid, MoneyField, SelectField } from "./fields"
import { FormDialog } from "./form-dialog"
import type { Lookup } from "./project-dialog"

export function TransactionDialog({
  transaction,
  clients,
  projects,
  trigger,
  open,
  onOpenChange,
  defaultType = "income",
}: {
  transaction?: Transaction
  clients: Lookup[]
  projects: Lookup[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  defaultType?: "income" | "expense"
}) {
  const [type, setType] = React.useState<string>(transaction?.type ?? defaultType)
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? "Kaydı düzenle" : "Yeni gelir / gider"}
      action={saveTransaction}
      successMessage="Kayıt işlendi"
    >
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <FormGrid>
        <SelectField
          name="type"
          label="Tür"
          options={[
            { value: "income", label: "Gelir" },
            { value: "expense", label: "Gider" },
          ]}
          defaultValue={type}
          onValueChange={setType}
        />
        <SelectField
          key={type}
          name="category"
          label="Kategori"
          options={categories}
          defaultValue={
            categories.some((c) => c.value === transaction?.category) ? transaction?.category : categories[0].value
          }
        />
        <MoneyField name="amount" label="Tutar" required currency={transaction?.currency ?? "TRY"} defaultValue={minorToInput(transaction?.amount)} />
        <SelectField name="currency" label="Para birimi" options={CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={transaction?.currency ?? "TRY"} />
        <DateField name="date" label="Tarih" required defaultValue={transaction?.date ?? todayISO()} />
        <SelectField name="method" label="Yöntem" options={PAYMENT_METHODS} defaultValue={transaction?.method ?? "none"} allowEmpty emptyLabel="Belirtilmedi" />
        <SelectField name="clientId" label="Müşteri" options={clients} defaultValue={transaction?.clientId ?? "none"} allowEmpty emptyLabel="Yok" />
        <SelectField name="projectId" label="Proje" options={projects} defaultValue={transaction?.projectId ?? "none"} allowEmpty emptyLabel="Yok" />
        <AreaField name="description" label="Açıklama" rows={2} defaultValue={transaction?.description ?? ""} placeholder="Vercel Pro aboneliği" />
      </FormGrid>
    </FormDialog>
  )
}
