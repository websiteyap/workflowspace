"use server"

import { desc, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { alertEvents, alertRules, holdings, wallets } from "@/db/schema"
import { requireSession } from "@/lib/auth/guard"
import { toMinor } from "@/lib/format"
import { convertToBase } from "@/lib/fx"
import { searchCoins } from "@/lib/market"
import { type ActionState, bool, newId, nowISO, reqStr, run, str } from "./helpers"

const touch = () => {
  revalidatePath("/yatirim")
  revalidatePath("/")
}

export async function findCoins(query: string) {
  await requireSession()
  return searchCoins(query)
}

export async function saveHolding(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const currency = str(fd, "currency") ?? "TRY"
    const costInput = str(fd, "costBasis")
    const costBasis = costInput ? toMinor(costInput) : null
    const converted = costBasis ? await convertToBase(costBasis, currency) : null
    const manualInput = str(fd, "manualPrice")

    const amount = (str(fd, "amount") ?? "0").replace(",", ".")
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return { error: "Miktar geçerli bir sayı olmalı." }
    }

    const data = {
      kind: str(fd, "kind") ?? "crypto",
      coinId: str(fd, "coinId"),
      symbol: reqStr(fd, "symbol", "Sembol").toUpperCase(),
      name: str(fd, "name"),
      amount,
      costBasis,
      currency,
      baseCost: converted?.baseAmount ?? null,
      manualPrice: manualInput ? toMinor(manualInput) : null,
      walletId: str(fd, "walletId") === "none" ? null : str(fd, "walletId"),
      notes: str(fd, "notes"),
      updatedAt: nowISO(),
    }

    if (id) await db.update(holdings).set(data).where(eq(holdings.id, id))
    else await db.insert(holdings).values({ id: newId(), ...data, createdAt: nowISO() })

    touch()
    return { ok: true }
  })
}

export async function deleteHolding(id: string) {
  await requireSession()
  await db.delete(holdings).where(eq(holdings.id, id))
  touch()
}

export async function saveWallet(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const data = {
      label: reqStr(fd, "label", "Etiket"),
      chain: str(fd, "chain") ?? "ethereum",
      address: reqStr(fd, "address", "Adres"),
      notes: str(fd, "notes"),
    }
    if (id) await db.update(wallets).set(data).where(eq(wallets.id, id))
    else await db.insert(wallets).values({ id: newId(), ...data, createdAt: nowISO() })
    touch()
    return { ok: true }
  })
}

export async function deleteWallet(id: string) {
  await requireSession()
  await db.delete(wallets).where(eq(wallets.id, id))
  touch()
}

export async function saveAlertRule(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const threshold = (str(fd, "threshold") ?? "").replace(",", ".")
    if (!Number.isFinite(Number(threshold))) return { error: "Eşik geçerli bir sayı olmalı." }

    const data = {
      coinId: reqStr(fd, "coinId", "Varlık"),
      symbol: reqStr(fd, "symbol", "Sembol").toUpperCase(),
      kind: str(fd, "kind") ?? "price_below",
      threshold,
      enabled: bool(fd, "enabled"),
      note: str(fd, "note"),
    }

    if (id) await db.update(alertRules).set(data).where(eq(alertRules.id, id))
    else await db.insert(alertRules).values({ id: newId(), ...data, createdAt: nowISO() })

    touch()
    return { ok: true }
  })
}

export async function deleteAlertRule(id: string) {
  await requireSession()
  await db.delete(alertRules).where(eq(alertRules.id, id))
  touch()
}

export async function toggleAlertRule(id: string, enabled: boolean) {
  await requireSession()
  await db.update(alertRules).set({ enabled: enabled ? 1 : 0 }).where(eq(alertRules.id, id))
  touch()
}

export async function markAlertsRead() {
  await requireSession()
  await db.update(alertEvents).set({ readAt: nowISO() }).where(isNull(alertEvents.readAt))
  touch()
}

export async function recentAlerts(limit = 20) {
  await requireSession()
  return db.select().from(alertEvents).orderBy(desc(alertEvents.createdAt)).limit(limit)
}
