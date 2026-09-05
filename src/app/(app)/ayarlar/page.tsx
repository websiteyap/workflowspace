import { PageHeader } from "@/components/shared/page-header"
import { accountInfo, ipSettings, twoFactorEnabled } from "@/lib/actions/auth"
import { listPasskeys } from "@/lib/actions/passkeys"
import { activeSession, listSessions } from "@/lib/auth/store"
import { pushSubscriptionCount } from "@/lib/actions/push"
import { calendarToken } from "@/lib/calendar"
import { recentAudit, recentErrors } from "@/lib/observability"
import { dataCounts } from "@/lib/queries"
import { PushSettings } from "@/components/reminders/push-settings"
import { AccountSection } from "./account-client"
import { CalendarSection } from "./calendar-client"
import { NetworkSection } from "./network-client"
import { PasskeySection } from "./passkey-client"
import { LogsSection } from "./logs-client"
import { SessionsSection, TwoFactorSection } from "./security-client"
import { DataTools } from "./settings-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ayarlar" }

export default async function SettingsPage() {
  const [counts, sessions, session, twoFactor, audit, errors, pushCount] = await Promise.all([
    dataCounts(),
    listSessions(),
    activeSession(),
    twoFactorEnabled(),
    recentAudit(80),
    recentErrors(40),
    pushSubscriptionCount(),
  ])
  const [account, passkeyList, ip] = await Promise.all([accountInfo(), listPasskeys(), ipSettings()])

  const base = process.env.APP_URL ?? "https://workflow.pvdre.space"
  const calendarUrl = `${base}/api/takvim?t=${calendarToken()}`

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="Görünüm, güvenlik ve veri yönetimi" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <AccountSection username={account.username} overridden={account.overridden} />
          <PasskeySection items={passkeyList} />
          <TwoFactorSection enabled={twoFactor} />
          <SessionsSection sessions={sessions} currentId={session?.id ?? ""} />
          <PushSettings subscriberCount={pushCount} />
          <NetworkSection list={ip.list} current={ip.current} />
          <CalendarSection url={calendarUrl} />
        </div>
        <div className="space-y-4">
          <DataTools counts={counts} />
          <LogsSection audit={audit} errors={errors} />
        </div>
      </div>
    </div>
  )
}
