"use client"

import * as React from "react"
import type { ProjectItem } from "@/db/schema"
import { saveProjectItem } from "@/lib/actions/projects"
import { ITEM_KIND } from "@/lib/constants"
import { CURRENCIES, minorToInput, todayISO } from "@/lib/format"
import { AreaField, DateField, FormGrid, MoneyField, SelectField, TextField } from "./fields"
import { FormDialog } from "./form-dialog"

export function ItemDialog({
  projectId,
  item,
  trigger,
  open,
  onOpenChange,
  defaultCurrency = "TRY",
}: {
  projectId: string
  item?: ProjectItem
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  defaultCurrency?: string
}) {
  const [currency, setCurrency] = React.useState(item?.currency ?? defaultCurrency)
  const [recurring, setRecurring] = React.useState(item?.recurring === 1)

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Kalemi düzenle" : "Ek kalem ekle"}
      description="Projeye sonradan eklenen ücret veya maliyetler."
      action={saveProjectItem}
      successMessage={item ? "Kalem güncellendi" : "Kalem eklendi"}
    >
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="recurring" value={recurring ? "on" : ""} />

      <FormGrid>
        <TextField
          name="title"
          label="Kalem"
          required
          full
          defaultValue={item?.title}
          placeholder="Ek e-posta hesabı / SSL / ek geliştirme"
        />
        <SelectField name="kind" label="Tür" options={ITEM_KIND} defaultValue={item?.kind ?? "cost"} />
        <MoneyField
          name="amount"
          label="Tutar"
          required
          currency={currency}
          defaultValue={minorToInput(item?.amount)}
        />
        <SelectField
          name="currency"
          label="Para birimi"
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          defaultValue={currency}
          onValueChange={setCurrency}
        />
        <DateField name="date" label="Tarih" defaultValue={item?.date ?? todayISO()} />
        <AreaField name="notes" label="Not" rows={2} defaultValue={item?.notes ?? ""} />
      </FormGrid>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-3">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="mt-0.5 size-4 accent-foreground"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Döngüye dahil et</span>
          <span className="block text-xs text-muted-foreground">
            İşaretlersen her ödeme döngüsünde tekrarlanır ve proje ücretine eklenir. İşaretlemezsen tek
            seferlik olarak kaydedilir.
          </span>
        </span>
      </label>
    </FormDialog>
  )
}
