"use client"

import * as React from "react"
import { addContribution } from "@/lib/actions/goals"
import { CURRENCIES, todayISO } from "@/lib/format"
import { DateField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export function ContributionDialog({
  goalId,
  goalTitle,
  defaultCurrency = "TRY",
  trigger,
  open,
  onOpenChange,
}: {
  goalId: string
  goalTitle: string
  defaultCurrency?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  const [currency, setCurrency] = React.useState(defaultCurrency)

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title="Kumbaraya para ekle"
      description={goalTitle}
      action={addContribution}
      successMessage="Kumbaraya eklendi"
      width="sm"
    >
      <input type="hidden" name="goalId" value={goalId} />
      <FormGrid>
        <MoneyField name="amount" label="Tutar" required currency={currency} />
        <SelectField
          name="currency"
          label="Para birimi"
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          defaultValue={currency}
          onValueChange={setCurrency}
        />
        <DateField name="date" label="Tarih" defaultValue={todayISO()} />
        <TextField name="note" label="Not" placeholder="Nereden ayrıldı" />
      </FormGrid>
    </FormDialog>
  )
}
