"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { vaultItems } from "@/db/schema"
import { requireSession } from "@/lib/auth/guard"
import { audit } from "@/lib/observability"
import { getSetting, setSetting } from "@/lib/auth/store"
import { open } from "@/lib/auth/secret-box"
import { verifyCode } from "@/lib/auth/totp"
import { newId, nowISO } from "./helpers"

const VAULT_SALT = "vault_salt"
const VAULT_2FA = "vault_require_2fa"
const VAULT_CHECK = "vault_check"

export async function vaultConfig() {
  await requireSession()
  const [salt, check, require2fa, totp] = await Promise.all([
    getSetting(VAULT_SALT),
    getSetting(VAULT_CHECK),
    getSetting(VAULT_2FA),
    getSetting("totp_secret"),
  ])
  return {
    initialized: Boolean(salt && check),
    salt,
    check,
    requires2fa: require2fa === "1" && Boolean(totp),
    twoFactorAvailable: Boolean(totp),
  }
}

export async function setVaultTwoFactor(enabled: boolean) {
  const session = await requireSession()
  if (enabled && !(await getSetting("totp_secret"))) {
    return { error: "Önce hesap için iki adımlı doğrulamayı açman gerekiyor." }
  }
  await setSetting(VAULT_2FA, enabled ? "1" : "0")
  await audit(enabled ? "vault_2fa_enabled" : "vault_2fa_disabled", "vault", { sessionId: session.id })
  revalidatePath("/kasa")
  return { ok: true }
}

export async function verifyVaultCode(code: string) {
  await requireSession()
  const sealed = await getSetting("totp_secret")
  if (!sealed) return { ok: true }
  const secret = open(sealed)
  if (!verifyCode(secret, code)) return { error: "Doğrulama kodu hatalı." }
  return { ok: true }
}

export async function initVault(salt: string, check: string) {
  await requireSession()
  if (await getSetting(VAULT_SALT)) return { error: "Kasa zaten kurulmuş." }
  if (!salt || !check) return { error: "Eksik parametre." }

  await setSetting(VAULT_SALT, salt)
  await setSetting(VAULT_CHECK, check)
  await audit("init", "vault")
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
  await audit(id ? "update" : "create", "vault_item", { entityId: id })
  revalidatePath("/kasa")
  return { ok: true }
}

export async function deleteVaultItem(id: string) {
  await requireSession()
  await db.delete(vaultItems).where(eq(vaultItems.id, id))
  await audit("delete", "vault_item", { entityId: id })
  revalidatePath("/kasa")
}

export async function vaultCount() {
  await requireSession()
  const rows = await db.select({ id: vaultItems.id }).from(vaultItems)
  return rows.length
}
