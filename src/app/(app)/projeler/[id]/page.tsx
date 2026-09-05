import { ArrowLeft, Code2, ExternalLink, TrendingDown, Wallet } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { QuickTask } from "@/components/shared/quick-task"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { TaskItem } from "@/components/shared/task-item"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ALL_CATEGORIES, BILLING_TYPE, PAYMENT_STATUS, PRIORITY, PROJECT_STATUS, label as labelOf } from "@/lib/constants"
import { formatDate, money, relativeDay } from "@/lib/format"
import { lookups, projectDetail } from "@/lib/queries"
import { ProjectHeaderActions } from "./project-actions"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await projectDetail(id)
  return { title: data?.project.name ?? "Proje" }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, look] = await Promise.all([projectDetail(id), lookups()])
  if (!data) notFound()

  const { project, clientName, tasks, payments, transactions, notes, earned, spent, pending } = data
  const openTasks = tasks.filter((t) => t.status !== "done")
  const doneTasks = tasks.filter((t) => t.status === "done")
  const budgetPct = project.budget ? Math.min(100, Math.round((earned / project.budget) * 100)) : null
  const links = [
    project.repoUrl && { icon: Code2, label: "Repo", href: project.repoUrl },
    project.liveUrl && { icon: ExternalLink, label: "Canlı", href: project.liveUrl },
  ].filter(Boolean) as { icon: typeof Code2; label: string; href: string }[]

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 text-muted-foreground">
        <Link href="/projeler">
          <ArrowLeft className="size-4" /> Projeler
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge options={PROJECT_STATUS} value={project.status} />
            <StatusBadge options={PRIORITY} value={project.priority} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.clientId ? (
              <Link href={`/musteriler/${project.clientId}`} className="hover:underline">
                {clientName}
              </Link>
            ) : (
              "İç proje"
            )}
            {" · "}
            {labelOf(BILLING_TYPE, project.billingType)}
            {project.dueDate ? ` · Teslim ${formatDate(project.dueDate)}` : ""}
          </p>
          {links.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href.startsWith("http") ? l.href : `https://${l.href}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <l.icon className="size-3.5" />
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <ProjectHeaderActions project={project} clients={look.clients} projects={look.projects} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bütçe"
          value={project.budget ? money(project.budget, project.currency) : "—"}
          hint={budgetPct !== null ? `%${budgetPct} tahsil edildi` : "bütçe girilmemiş"}
        />
        <StatCard label="Tahsilat" value={money(earned, project.currency)} icon={Wallet} accent="positive" />
        <StatCard label="Proje gideri" value={money(spent, project.currency)} icon={TrendingDown} />
        <StatCard label="Bekleyen ödeme" value={money(pending, project.currency)} hint={`${payments.filter((p) => p.status === "pending").length} kayıt`} />
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">İlerleme</span>
          <span className="tabular text-muted-foreground">%{project.progress}</span>
        </div>
        <Progress value={project.progress} className="mt-2 h-2" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {doneTasks.length}/{tasks.length} görev tamamlandı
          </span>
          {project.startDate && <span>Başlangıç: {formatDate(project.startDate)}</span>}
        </div>
      </section>

      {project.description && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium">Açıklama</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          {project.stack && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.stack.split(",").map((s) => (
                <span key={s} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {s.trim()}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-medium">Görevler</h2>
            <span className="text-xs text-muted-foreground">
              {openTasks.length} açık · {doneTasks.length} tamamlandı
            </span>
          </div>
          <div className="space-y-1 p-3">
            {openTasks.map((t) => (
              <TaskItem key={t.id} task={t} projects={look.projects} />
            ))}
            {openTasks.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Açık görev yok.</p>
            )}
            <div className="px-2 pt-2">
              <QuickTask projectId={project.id} placeholder="Bu projeye görev ekle…" />
            </div>
            {doneTasks.length > 0 && (
              <details className="px-2 pt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Tamamlananları göster ({doneTasks.length})
                </summary>
                <div className="mt-1">
                  {doneTasks.map((t) => (
                    <TaskItem key={t.id} task={t} projects={look.projects} />
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Ödeme planı</h2>
            </div>
            {payments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Ödeme kaydı yok.</p>
            ) : (
              <ul className="divide-y">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.dueDate)}
                        {p.status === "pending" ? ` · ${relativeDay(p.dueDate)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <p className="text-sm font-medium tabular">{money(p.amount, p.currency)}</p>
                      <StatusBadge options={PAYMENT_STATUS} value={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Finansal hareketler</h2>
            </div>
            {transactions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Hareket yok.</p>
            ) : (
              <ul className="divide-y">
                {transactions.slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="w-16 shrink-0 tabular text-xs text-muted-foreground">{formatDate(t.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {t.description || labelOf(ALL_CATEGORIES, t.category)}
                    </span>
                    <span
                      className={
                        t.type === "income"
                          ? "shrink-0 tabular font-medium text-emerald-600 dark:text-emerald-400"
                          : "shrink-0 tabular font-medium"
                      }
                    >
                      {t.type === "income" ? "+" : "−"}
                      {money(t.amount, t.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {notes.length > 0 && (
            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-medium">Proje notları</h2>
              </div>
              <ul className="divide-y">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{n.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
