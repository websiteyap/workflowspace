"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { CURRENCY_COOKIE } from "@/lib/display-currency"
import { CURRENCIES } from "@/lib/format"

export async function setDisplayCurrency(currency: string) {
  if (!(CURRENCIES as readonly string[]).includes(currency)) return
  const store = await cookies()
  store.set(CURRENCY_COOKIE, currency, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  for (const path of ["/", "/projeler", "/odemeler", "/finans", "/gorevler", "/ayarlar"]) {
    revalidatePath(path)
  }
}
