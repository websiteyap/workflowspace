"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setDisplayCurrency } from "@/lib/actions/preferences"
import { CURRENCIES, CURRENCY_SYMBOL, type RateMap } from "@/lib/format"

export function CurrencySwitch({ display, rates }: { display: string; rates: RateMap }) {
  const [pending, start] = React.useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2 font-medium tabular" disabled={pending}>
          {CURRENCY_SYMBOL[display] ?? display}
          <span className="hidden sm:inline">{display}</span>
          <ChevronsUpDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Tüm tutarlar bu birimde gösterilir
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CURRENCIES.map((currency) => (
          <DropdownMenuItem
            key={currency}
            onSelect={() => start(() => setDisplayCurrency(currency))}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="w-4 text-center">{CURRENCY_SYMBOL[currency]}</span>
              {currency}
            </span>
            <span className="flex items-center gap-2">
              {currency !== "TRY" && (
                <span className="tabular text-xs text-muted-foreground">
                  {(rates[currency] ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                </span>
              )}
              {display === currency && <Check className="size-3.5" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
