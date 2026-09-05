import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { ReminderEngine } from "@/components/reminders/reminder-engine"
import { searchIndex } from "@/lib/queries"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const entries = await searchIndex()

  return (
    <div className="min-h-svh bg-background">
      <Sidebar />
      <ReminderEngine />
      <div className="lg:pl-60">
        <Topbar entries={entries} />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
