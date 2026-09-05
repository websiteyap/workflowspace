"use client"

import {
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { DomainDialog } from "@/components/forms/domain-dialog"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { ItemDialog } from "@/components/forms/item-dialog"
import { ProjectDialog } from "@/components/forms/project-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Project, ProjectDomain, ProjectItem } from "@/db/schema"
import {
  advancePayment,
  deleteDomain,
  deleteProjectById,
  deleteProjectItem,
  markMaintenanceDone,
  updateProjectStatus,
} from "@/lib/actions/projects"
import { ITEM_KIND, PROJECT_STATUS } from "@/lib/constants"
import { type RateMap, daysFromToday, formatBase, formatDate, money, relativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"

export function ProjectHeaderActions({ project }: { project: Project }) {
  const router = useRouter()
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [, start] = React.useTransition()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {PROJECT_STATUS.find((s) => s.value === project.status)?.label ?? "Durum"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {PROJECT_STATUS.map((s) => (
            <DropdownMenuItem key={s.value} onSelect={() => start(() => updateProjectStatus(project.id, s.value))}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          start(async () => {
            await markMaintenanceDone(project.id)
            toast.success("Bakım tarihi bugüne alındı")
          })
        }
      >
        <Wrench className="size-4" /> Bakım yapıldı
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEdit(true)}>
        <Pencil className="size-4" /> Düzenle
      </Button>
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => setDel(true)}>
        <Trash2 className="size-4" />
        <span className="sr-only">Sil</span>
      </Button>

      <ProjectDialog project={project} open={edit} onOpenChange={setEdit} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={async () => {
          await deleteProjectById(project.id)
          router.push("/projeler")
        }}
        title={`${project.name} silinsin mi?`}
        description="Bu işe bağlı görevler, ek kalemler ve alan adları da silinir."
      />
    </div>
  )
}

export function BillingPanel({
  project,
  display,
  rates,
  cycleRevenue,
  cycleNet,
  monthlyRevenue,
  cycleLabel,
}: {
  project: Project
  display: string
  rates: RateMap
  cycleRevenue: number
  cycleNet: number
  monthlyRevenue: number
  cycleLabel: string
}) {
  const [, start] = React.useTransition()
  const recurring = project.billingCycle !== "none"
  const days = daysFromToday(project.nextPaymentDate)
  const due = days !== null && days <= 0
  const soon = days !== null && days > 0 && days <= (project.reminderDaysBefore ?? 7)

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Ücretlendirme</h2>
          <p className="text-xs text-muted-foreground">
            {recurring ? cycleLabel : "Tek seferlik"}
            {project.startDate ? ` · başlangıç ${formatDate(project.startDate)}` : ""}
          </p>
        </div>
        {recurring && (
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3" />
            {cycleLabel}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4">
        {[
          ["Döngü ücreti", formatBase(cycleRevenue, display, rates), ""],
          ["Döngü net", formatBase(cycleNet, display, rates), cycleNet < 0 ? "text-red-600 dark:text-red-400" : ""],
          ["Aylık karşılık", recurring ? formatBase(monthlyRevenue, display, rates) : "—", ""],
          [
            "Girilen tutar",
            project.price ? money(project.price, project.currency) : "—",
            "text-muted-foreground",
          ],
        ].map(([label, value, tone]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("mt-0.5 font-semibold tabular", tone)}>{value}</dd>
          </div>
        ))}
      </dl>

      {recurring && (
        <div
          className={cn(
            "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            due && "bg-red-500/[0.04]",
            soon && !due && "bg-amber-500/[0.05]",
          )}
        >
          <div>
            <p className="text-sm font-medium">
              Sonraki ödeme:{" "}
              <span className={cn("tabular", due && "text-red-600 dark:text-red-400")}>
                {project.nextPaymentDate ? formatDate(project.nextPaymentDate) : "—"}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.nextPaymentDate ? relativeDay(project.nextPaymentDate) : "Başlangıç tarihi girilmemiş"}
              {project.reminderDaysBefore ? ` · ${project.reminderDaysBefore} gün önce hatırlatılır` : ""}
              {project.lastPaymentDate ? ` · son tahsilat ${formatDate(project.lastPaymentDate)}` : ""}
            </p>
          </div>
          <Button
            size="sm"
            variant={due ? "default" : "outline"}
            className="gap-1.5"
            disabled={!project.nextPaymentDate}
            onClick={() =>
              start(async () => {
                await advancePayment(project.id)
                toast.success("Ödeme alındı, sonraki döngüye geçildi")
              })
            }
          >
            <CheckCircle2 className="size-4" /> Ödeme alındı
          </Button>
        </div>
      )}
    </section>
  )
}

export function ItemsPanel({
  projectId,
  currency,
  items,
  display,
  rates,
}: {
  projectId: string
  currency: string
  items: ProjectItem[]
  display: string
  rates: RateMap
}) {
  const [add, setAdd] = React.useState(false)
  const [edit, setEdit] = React.useState<ProjectItem | null>(null)
  const [del, setDel] = React.useState<ProjectItem | null>(null)
  const recurring = items.filter((i) => i.recurring === 1)
  const oneOff = items.filter((i) => i.recurring === 0)

  const row = (item: ProjectItem) => (
    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <StatusBadge options={ITEM_KIND} value={item.kind} className="py-0" />
          {item.date && <span>{formatDate(item.date)}</span>}
          {item.currency !== display && <span>{money(item.amount, item.currency)}</span>}
        </p>
        {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-medium tabular",
          item.kind === "charge" ? "text-emerald-600 dark:text-emerald-400" : "",
        )}
      >
        {item.kind === "charge" ? "+" : "−"}
        {formatBase(item.baseAmount, display, rates)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded p-1 text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">İşlemler</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEdit(item)}>
            <Pencil className="size-4" /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDel(item)}>
            <Trash2 className="size-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Ek kalemler</h2>
          <p className="text-xs text-muted-foreground">Sonradan eklenen ücret ve maliyetler</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdd(true)}>
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Henüz ek kalem yok. Ek bir hizmet ücreti ya da bu proje için ödediğin bir gideri buraya ekleyebilirsin.
        </p>
      ) : (
        <>
          {recurring.length > 0 && (
            <>
              <p className="border-b bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Döngüye dahil ({recurring.length})
              </p>
              <ul className="divide-y">{recurring.map(row)}</ul>
            </>
          )}
          {oneOff.length > 0 && (
            <>
              <p className="border-y bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Tek seferlik ({oneOff.length})
              </p>
              <ul className="divide-y">{oneOff.map(row)}</ul>
            </>
          )}
        </>
      )}

      <ItemDialog projectId={projectId} defaultCurrency={currency} open={add} onOpenChange={setAdd} />
      {edit && (
        <ItemDialog
          key={edit.id}
          projectId={projectId}
          item={edit}
          open
          onOpenChange={(o) => !o && setEdit(null)}
        />
      )}
      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        onConfirm={() => (del ? deleteProjectItem(del.id, projectId) : Promise.resolve())}
        title="Kalem silinsin mi?"
        description={del?.title ?? ""}
      />
    </section>
  )
}

export function DomainsPanel({ projectId, domains }: { projectId: string; domains: ProjectDomain[] }) {
  const [add, setAdd] = React.useState(false)
  const [edit, setEdit] = React.useState<ProjectDomain | null>(null)
  const [del, setDel] = React.useState<ProjectDomain | null>(null)

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-medium">Alan adları</h2>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdd(true)}>
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {domains.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Alan adı eklenmemiş.</p>
      ) : (
        <ul className="divide-y">
          {domains.map((d) => {
            const days = daysFromToday(d.expiresAt)
            const expiring = days !== null && days <= 30
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://${d.host}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 truncate text-sm hover:underline"
                  >
                    {d.host}
                    <ExternalLink className="size-3 opacity-50" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {d.isPrimary === 1 && <span className="mr-2 font-medium text-foreground">birincil</span>}
                    {d.registrar ?? "kayıt firması belirtilmedi"}
                    {d.expiresAt && (
                      <span className={cn("ml-2", expiring && "text-red-600 dark:text-red-400")}>
                        bitiş {formatDate(d.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded p-1 text-muted-foreground hover:bg-muted">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">İşlemler</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEdit(d)}>
                      <Pencil className="size-4" /> Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDel(d)}>
                      <Trash2 className="size-4" /> Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}

      <DomainDialog projectId={projectId} open={add} onOpenChange={setAdd} />
      {edit && (
        <DomainDialog
          key={edit.id}
          projectId={projectId}
          domain={edit}
          open
          onOpenChange={(o) => !o && setEdit(null)}
        />
      )}
      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        onConfirm={() => (del ? deleteDomain(del.id, projectId) : Promise.resolve())}
        title="Alan adı silinsin mi?"
        description={del?.host ?? ""}
      />
    </section>
  )
}

export function MaintenanceBadge({ date }: { date: string | null }) {
  const days = daysFromToday(date)
  const stale = days === null || days < -90
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      <CalendarCheck className="size-3.5" />
      {date ? `Son bakım ${formatDate(date)}` : "Bakım kaydı yok"}
    </span>
  )
}
