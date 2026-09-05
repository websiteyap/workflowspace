import { PageHeader } from "@/components/shared/page-header"
import { twoFactorEnabled } from "@/lib/actions/auth"
import { activeSession, listSessions } from "@/lib/auth/store"
import { dataCounts } from "@/lib/queries"
import { SessionsSection, TwoFactorSection } from "./security-client"
import { DataTools } from "./settings-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ayarlar" }

export default async function SettingsPage() {
  const [counts, sessions, session, twoFactor] = await Promise.all([
    dataCounts(),
    listSessions(),
    activeSession(),
    twoFactorEnabled(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="Görünüm, güvenlik ve veri yönetimi" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <TwoFactorSection enabled={twoFactor} />
          <SessionsSection sessions={sessions} currentId={session?.id ?? ""} />
        </div>
        <DataTools counts={counts} />
      </div>
    </div>
  )
}
