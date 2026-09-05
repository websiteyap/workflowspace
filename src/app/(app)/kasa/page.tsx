import { listVaultItems, vaultConfig } from "@/lib/actions/vault"
import { VaultClient } from "./vault-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Kasa" }

export default async function VaultPage() {
  const config = await vaultConfig()
  const rows = config.initialized ? await listVaultItems() : []

  return (
    <VaultClient
      initialized={config.initialized}
      salt={config.salt}
      check={config.check}
      rows={rows}
      requires2fa={config.requires2fa}
      twoFactorAvailable={config.twoFactorAvailable}
    />
  )
}
