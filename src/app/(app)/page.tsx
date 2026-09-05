import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FolderKanban,
  ListChecks,
  Pin,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { CashflowChart } from "@/components/charts/cashflow-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { QuickTask } from "@/components/shared/quick-task"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { TaskItem } from "@/components/shared/task-item"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PROJECT_STATUS } from "@/lib/constants"
import { formatDate, money, relativeDay, todayISO } from "@/lib/format"
import { cashflowSeries, dashboardData, lookups } from "@/lib/queries"

export const dynamic = "force-dynamic"

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return "İyi geceler"
  if (h < 12) return "Günaydın"
  if (h < 18) return "İyi çalışmalar"
  return "İyi akşamlar"
}

function pctDelta(current: number, previous: number) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

export default async function DashboardPage() {
  const [d, series, look] = await Promise.all([dashboardData(), cashflowSeries(6), lookups()])
  const net = d.income - d.expense
  const todayLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{greeting()}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-4" />
            {d.openTasks} açık görev
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FolderKanban className="size-4" />
            {d.openProjects} aktif proje
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            Bu hafta {d.weekDone} tamamlandı
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Gelir · ${d.monthLabel}`}
          value={money(d.income)}
          icon={TrendingUp}
          delta={pctDelta(d.income, d.prevIncome)}
          hint="geçen aya göre"
        />
        <StatCard
          label={`Gider · ${d.monthLabel}`}
          value={money(d.expense)}
          icon={TrendingDown}
          delta={pctDelta(d.expense, d.prevExpense)}
          hint="geçen aya göre"
        />
        <StatCard
          label="Net kâr"
          value={money(net)}
          icon={Wallet}
          accent={net >= 0 ? "positive" : "negative"}
          hint={net >= 0 ? "bu ay artıda" : "bu ay ekside"}
        />
        <StatCard
          label="Bekleyen tahsilat"
          value={money(d.receivable)}
          icon={CircleDollarSign}
          hint={`${d.upcomingPayments.length + d.overduePayments.length} açık kayıt`}
        />
      </div>

      {d.overduePayments.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.04] p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {d.overduePayments.length} ödemenin vadesi geçti ·{" "}
              <span className="tabular">
                {money(d.overduePayments.reduce((a, b) => a + b.payment.amount, 0))}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              En eskisi: {d.overduePayments[0].clientName ?? "Müşterisiz"} — {formatDate(d.overduePayments[0].payment.dueDate)}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/odemeler">Ödemelere git</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-medium">Nakit akışı</h2>
                <p className="text-xs text-muted-foreground">Son 6 ay</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <Link href="/finans">
                  <BarChart3 className="size-4" /> Detay
                </Link>
              </Button>
            </div>
            <div className="p-4">
              <CashflowChart data={series} />
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-medium">Bugünün hedefleri</h2>
                <p className="text-xs text-muted-foreground">
                  {d.todayTasks.length === 0 ? "Bugün için planlanmış görev yok" : `${d.todayTasks.length} görev planlandı`}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <Link href="/gorevler">
                  Tümü <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="space-y-1 p-3">
              {d.todayTasks.map((row) => (
                <TaskItem
                  key={row.task.id}
                  task={row.task}
                  projectName={row.projectName}
                  projects={look.projects}
                  showDate={false}
                />
              ))}
              {d.todayTasks.length === 0 && (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Bugüne bir hedef ekleyerek başlayın.
                </p>
              )}
              <div className="px-2 pt-2">
                <QuickTask dueDate={todayISO()} placeholder="Bugüne görev ekle…" />
              </div>
            </div>
          </section>

          {d.overdueTasks.length > 0 && (
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-medium">Geciken görevler</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {d.overdueTasks.length}
                </span>
              </div>
              <div className="space-y-1 p-3">
                {d.overdueTasks.map((row) => (
                  <TaskItem key={row.task.id} task={row.task} projectName={row.projectName} projects={look.projects} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-medium">Yaklaşan ödemeler</h2>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link href="/odemeler">Tümü</Link>
              </Button>
            </div>
            <ul className="divide-y">
              {d.upcomingPayments.map((row) => (
                <li key={row.payment.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{row.payment.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.clientName ?? "Müşterisiz"} · {relativeDay(row.payment.dueDate)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular">
                    {money(row.payment.amount, row.payment.currency)}
                  </span>
                </li>
              ))}
              {d.upcomingPayments.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">Yaklaşan ödeme yok</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-medium">Aktif projeler</h2>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link href="/projeler">Tümü</Link>
              </Button>
            </div>
            <ul className="divide-y">
              {d.activeProjects.map((row) => (
                <li key={row.project.id} className="px-4 py-3">
                  <Link href={`/projeler/${row.project.id}`} className="group block space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm group-hover:underline">{row.project.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.clientName ?? "İç proje"}</p>
                      </div>
                      <StatusBadge options={PROJECT_STATUS} value={row.project.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={row.project.progress} className="h-1.5" />
                      <span className="w-9 shrink-0 text-right text-xs tabular text-muted-foreground">
                        %{row.project.progress}
                      </span>
                    </div>
                    {row.project.dueDate && (
                      <p className="text-xs text-muted-foreground">Teslim: {relativeDay(row.project.dueDate)}</p>
                    )}
                  </Link>
                </li>
              ))}
              {d.activeProjects.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">Aktif proje yok</li>
              )}
            </ul>
          </section>

          {d.pinnedNotes.length > 0 && (
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Pin className="size-3.5 text-muted-foreground" />
                <h2 className="text-sm font-medium">Sabitlenen notlar</h2>
              </div>
              <ul className="divide-y">
                {d.pinnedNotes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {d.openTasks === 0 && d.openProjects === 0 && d.activeClients === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Panel henüz boş"
          description="Örnek verilerle hızlıca gezinmek isterseniz Ayarlar sayfasından demo verisi yükleyebilir, dilediğinizde temizleyebilirsiniz."
          action={
            <Button asChild size="sm">
              <Link href="/ayarlar">Ayarlara git</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
