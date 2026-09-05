"use client"

import * as React from "react"
import type { Transaction } from "@/db/schema"
import { saveTransaction } from "@/lib/actions/finance"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants"
import { CURRENCIES, minorToInput, todayISO } from "@/lib/format"
import { AreaField, DateField, Field, FormGrid, MoneyField, SelectField } from "./fields"
import { Input } from "@/components/ui/input"
import { PiggyBank } from "lucide-react"
import { FormDialog } from "./form-dialog"
import type { Lookup } from "./project-dialog"

export function TransactionDialog({
  transaction,
  projects,
  goals = [],
  trigger,
  open,
  onOpenChange,
  defaultType = "income",
}: {
  transaction?: Transaction
  projects: Lookup[]
  goals?: Lookup[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  defaultType?: "income" | "expense"
}) {
  const [type, setType] = React.useState<string>(transaction?.type ?? defaultType)
  const [goalId, setGoalId] = React.useState("none")
  const [mode, setMode] = React.useState("percent")
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const allocating = type === "income" && goalId !== "none"

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
        <SelectField name="projectId" label="Proje" options={projects} defaultValue={transaction?.projectId ?? "none"} allowEmpty emptyLabel="Yok" />
        <AreaField name="description" label="Açıklama" rows={2} defaultValue={transaction?.description ?? ""} placeholder="Vercel Pro aboneliği" />
      </FormGrid>

      {type === "income" && goals.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <PiggyBank className="size-4" /> Bu gelirden kumbaraya ayır
          </p>
          <FormGrid>
            <SelectField
              name="goalId"
              label="Hedef"
              options={goals}
              defaultValue="none"
              allowEmpty
              emptyLabel="Ayırma"
              onValueChange={setGoalId}
            />
            {allocating && (
              <Field label="Ne kadar">
                <div className="flex gap-2">
                  <select
                    name="allocationMode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="h-9 rounded-md border bg-transparent px-2 text-sm"
                  >
                    <option value="percent">%</option>
                    <option value="amount">Tutar</option>
                  </select>
                  <Input
                    name="allocationValue"
                    inputMode="decimal"
                    placeholder={mode === "percent" ? "20" : "5000"}
                    className="tabular"
                  />
                </div>
              </Field>
            )}
          </FormGrid>
          {allocating && (
            <p className="text-[11px] text-muted-foreground">
              Ayrılan tutar kumbarada bloke edilir; serbest bakiyeden düşülür ama gelirin kendisi aynı kalır.
            </p>
          )}
        </div>
      )}
    </FormDialog>
  )
}
