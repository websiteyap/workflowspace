"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Option } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
}

export function Field({
  label,
  htmlFor,
  hint,
  className,
  full,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  className?: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

export function TextField({
  name,
  label,
  full,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { name: string; label: string; full?: boolean; hint?: string }) {
  return (
    <Field label={label} htmlFor={name} full={full} hint={hint}>
      <Input id={name} name={name} {...props} />
    </Field>
  )
}

export function AreaField({
  name,
  label,
  full = true,
  hint,
  ...props
}: React.ComponentProps<typeof Textarea> & { name: string; label: string; full?: boolean; hint?: string }) {
  return (
    <Field label={label} htmlFor={name} full={full} hint={hint}>
      <Textarea id={name} name={name} {...props} />
    </Field>
  )
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
  placeholder = "Seçin",
  full,
  hint,
  allowEmpty,
  emptyLabel = "Yok",
  onValueChange,
}: {
  name: string
  label: string
  options: Option[] | { value: string; label: string }[]
  defaultValue?: string | null
  placeholder?: string
  full?: boolean
  hint?: string
  allowEmpty?: boolean
  emptyLabel?: string
  onValueChange?: (v: string) => void
}) {
  return (
    <Field label={label} full={full} hint={hint}>
      <Select name={name} defaultValue={defaultValue ?? (allowEmpty ? "none" : undefined)} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="none">{emptyLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

export function MoneyField({
  name,
  label,
  defaultValue,
  currency = "TRY",
  full,
  hint,
  required,
}: {
  name: string
  label: string
  defaultValue?: string | number | null
  currency?: string
  full?: boolean
  hint?: string
  required?: boolean
}) {
  const symbol = currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency
  return (
    <Field label={label} htmlFor={name} full={full} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {symbol}
        </span>
        <Input
          id={name}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder="0"
          className="pl-7 tabular"
        />
      </div>
    </Field>
  )
}

export function DateField({
  name,
  label,
  defaultValue,
  full,
  hint,
  required,
}: {
  name: string
  label: string
  defaultValue?: string | null
  full?: boolean
  hint?: string
  required?: boolean
}) {
  return (
    <Field label={label} htmlFor={name} full={full} hint={hint}>
      <Input
        id={name}
        name={name}
        type="date"
        required={required}
        defaultValue={defaultValue?.slice(0, 10) ?? ""}
        className="tabular [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:dark:invert"
      />
    </Field>
  )
}
