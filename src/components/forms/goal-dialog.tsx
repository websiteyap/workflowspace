"use client"

import * as React from "react"
import type { Goal } from "@/db/schema"
import { saveGoal } from "@/lib/actions/goals"
import { GOAL_STATUS, GOAL_TYPE, PRIORITY } from "@/lib/constants"
import { CURRENCIES, minorToInput } from "@/lib/format"
import { AreaField, DateField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export function GoalDialog({
  goal,
  trigger,
  open,
  onOpenChange,
}: {
  goal?: Goal
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
}) {
  const [currency, setCurrency] = React.useState(goal?.currency ?? "TRY")

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Hedefi düzenle" : "Yeni hedef"}
      description="Almak istediğin bir abonelik, kitap, kurs veya cihaz."
      action={saveGoal}
      successMessage={goal ? "Güncellendi" : "Hedef eklendi"}
    >
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <FormGrid>
        <TextField
          name="title"
          label="Ne istiyorsun?"
          required
          full
          defaultValue={goal?.title}
          placeholder="Claude Max aboneliği"
        />
        <SelectField name="type" label="Tür" options={GOAL_TYPE} defaultValue={goal?.type ?? "other"} />
        <SelectField name="status" label="Durum" options={GOAL_STATUS} defaultValue={goal?.status ?? "open"} />
        <TextField
          name="url"
          label="Bağlantı"
          full
          defaultValue={goal?.url ?? ""}
          placeholder="https://…"
        />
        <MoneyField
          name="targetAmount"
          label="Fiyat"
          currency={currency}
          defaultValue={minorToInput(goal?.targetAmount)}
          hint="Boş bırakırsan ücretsiz sayılır, kumbara açılmaz"
        />
        <SelectField
          name="currency"
          label="Para birimi"
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          defaultValue={currency}
          onValueChange={setCurrency}
        />
        <SelectField name="priority" label="Öncelik" options={PRIORITY} defaultValue={goal?.priority ?? "medium"} />
        <DateField name="targetDate" label="Hedef tarih" defaultValue={goal?.targetDate} />
        <AreaField
          name="notes"
          label="Not"
          rows={3}
          defaultValue={goal?.notes ?? ""}
          placeholder="Neden istiyorsun, hangi alternatifleri değerlendirdin…"
        />
      </FormGrid>
    </FormDialog>
  )
}
