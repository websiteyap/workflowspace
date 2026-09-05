"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { vaultItems } from "@/db/schema"
import { requireSession } from "@/lib/auth/guard"
import { getSetting, setSetting } from "@/lib/auth/store"
import { newId, nowISO } from "./helpers"

const VAULT_SALT = "vault_salt"
const VAULT_CHECK = "vault_check"

export async function vaultConfig() {
  await requireSession()
  const [salt, check] = await Promise.all([getSetting(VAULT_SALT), getSetting(VAULT_CHECK)])
  return { initialized: Boolean(salt && check), salt, check }
}

export async function initVault(salt: string, check: string) {
  await requireSession()
  if (await getSetting(VAULT_SALT)) return { error: "Kasa zaten kurulmuş." }
  if (!salt || !check) return { error: "Eksik parametre." }

  await setSetting(VAULT_SALT, salt)
  await setSetting(VAULT_CHECK, check)
  revalidatePath("/kasa")
  return { ok: true }
}

export async function listVaultItems() {
  await requireSession()
  return db.select().from(vaultItems).orderBy(desc(vaultItems.updatedAt))
}

export async function saveVaultItem(id: string | null, cipher: string) {
  await requireSession()
  if (!cipher || cipher.length > 20000) return { error: "Geçersiz kayıt." }

  if (id) {
    await db.update(vaultItems).set({ cipher, updatedAt: nowISO() }).where(eq(vaultItems.id, id))
  } else {
    await db.insert(vaultItems).values({ id: newId(), cipher, createdAt: nowISO(), updatedAt: nowISO() })
  }
  revalidatePath("/kasa")
  return { ok: true }
}

export async function deleteVaultItem(id: string) {
  await requireSession()
  await db.delete(vaultItems).where(eq(vaultItems.id, id))
  revalidatePath("/kasa")
}

export async function vaultCount() {
  await requireSession()
  const rows = await db.select({ id: vaultItems.id }).from(vaultItems)
  return rows.length
}
