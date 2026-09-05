"use server"

import { and, desc, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { alertEvents, alertRules, holdings, walletBalances, wallets } from "@/db/schema"
import { requireSession } from "@/lib/auth/guard"
import { toMinor } from "@/lib/format"
import { convertToBase } from "@/lib/fx"
import { searchCoins } from "@/lib/market"
import { CHAINS, type ChainId, isAddress, isSupportedChain, nativeBalance, tokenBalance, tokenMetadata } from "@/lib/chain"
import { seal } from "@/lib/auth/secret-box"
import { getSetting, setSetting } from "@/lib/auth/store"
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

export async function etherscanKeyStatus() {
  await requireSession()
  const key = await getSetting("etherscan_api_key")
  return { configured: Boolean(key) }
}

export async function saveEtherscanKey(key: string) {
  await requireSession()
  const clean = key.trim()
  if (clean && !/^[A-Za-z0-9]{20,}$/.test(clean)) return { error: "Anahtar formatı geçersiz." }
  await setSetting("etherscan_api_key", clean ? seal(clean) : "")
  touch()
  return { ok: true }
}

export async function addWalletToken(walletId: string, contract: string) {
  await requireSession()
  const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId))
  if (!wallet) return { error: "Cüzdan bulunamadı." }
  if (!isSupportedChain(wallet.chain)) return { error: "Bu zincirde token takibi desteklenmiyor." }
  if (!isAddress(contract)) return { error: "Geçersiz kontrat adresi." }

  try {
    const meta = await tokenMetadata(wallet.chain as ChainId, contract.trim())
    const matches = await searchCoins(meta.symbol)
    const coinId = matches.find((c) => c.symbol.toUpperCase() === meta.symbol.toUpperCase())?.id ?? null

    await db.insert(walletBalances).values({
      id: newId(),
      walletId,
      kind: "token",
      contract: contract.trim().toLowerCase(),
      symbol: meta.symbol,
      decimals: meta.decimals,
      coinId,
      amount: "0",
      updatedAt: new Date().toISOString(),
    })

    touch()
    return { ok: true, symbol: meta.symbol }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Token eklenemedi." }
  }
}

export async function removeWalletBalance(id: string) {
  await requireSession()
  await db.delete(walletBalances).where(eq(walletBalances.id, id))
  touch()
}

export async function syncWallets() {
  await requireSession()
  const rows = await db.select().from(wallets)
  const now = new Date().toISOString()
  let updated = 0
  const errors: string[] = []

  for (const wallet of rows) {
    if (!isSupportedChain(wallet.chain) || !isAddress(wallet.address)) continue
    const chain = wallet.chain as ChainId
    const info = CHAINS[chain]

    try {
      const amount = await nativeBalance(chain, wallet.address.trim())
      const [existing] = await db
        .select()
        .from(walletBalances)
        .where(and(eq(walletBalances.walletId, wallet.id), eq(walletBalances.kind, "native")))

      if (existing) {
        await db.update(walletBalances).set({ amount, updatedAt: now }).where(eq(walletBalances.id, existing.id))
      } else {
        await db.insert(walletBalances).values({
          id: newId(),
          walletId: wallet.id,
          kind: "native",
          contract: null,
          symbol: info.nativeSymbol,
          decimals: info.nativeDecimals,
          coinId: info.nativeCoinId,
          amount,
          updatedAt: now,
        })
      }
      updated += 1
    } catch (error) {
      errors.push(`${wallet.label}: ${error instanceof Error ? error.message : "hata"}`)
    }

    const tokens = await db
      .select()
      .from(walletBalances)
      .where(and(eq(walletBalances.walletId, wallet.id), eq(walletBalances.kind, "token")))

    for (const token of tokens) {
      if (!token.contract) continue
      try {
        const amount = await tokenBalance(chain, token.contract, wallet.address.trim(), token.decimals)
        await db.update(walletBalances).set({ amount, updatedAt: now }).where(eq(walletBalances.id, token.id))
        updated += 1
      } catch {
        errors.push(`${wallet.label} / ${token.symbol}`)
      }
    }
  }

  touch()
  return { updated, errors }
}
