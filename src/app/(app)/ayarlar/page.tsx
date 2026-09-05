import { PageHeader } from "@/components/shared/page-header"
import { dataCounts } from "@/lib/queries"
import { DataTools } from "./settings-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ayarlar" }

export default async function SettingsPage() {
  const counts = await dataCounts()
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Ayarlar" description="Görünüm tercihleri ve veri yönetimi" />
      <DataTools counts={counts} />
    </div>
  )
}
