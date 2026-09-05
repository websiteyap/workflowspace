import "server-only"
import { cookies } from "next/headers"
import { BASE_CURRENCY, CURRENCIES } from "./format"
import { getRates } from "./fx"

export const CURRENCY_COOKIE = "source_currency"

export async function displayCurrency() {
  const store = await cookies()
  const value = store.get(CURRENCY_COOKIE)?.value
  return (CURRENCIES as readonly string[]).includes(value ?? "") ? (value as string) : BASE_CURRENCY
}

export async function moneyContext() {
  const [display, rates] = await Promise.all([displayCurrency(), getRates()])
  return { display, rates }
}
