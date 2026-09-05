"use client"

import {
  BookOpen,
  Check,
  ExternalLink,
  MoreHorizontal,
  PiggyBank,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Undo2,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { ContributionDialog } from "@/components/forms/contribution-dialog"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { GoalDialog } from "@/components/forms/goal-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useNewParam } from "@/hooks/use-new-param"
import { deleteGoal, purchaseGoal, setGoalStatus, withdrawAll } from "@/lib/actions/goals"
import { GOAL_STATUS, GOAL_TYPE, label as labelOf } from "@/lib/constants"
import { type RateMap, formatBase, formatDate, money, relativeDay } from "@/lib/format"
import type { GoalRow } from "@/lib/queries"
import { cn } from "@/lib/utils"

const FILTERS = [
  { value: "open", label: "Açık" },
  { value: "funded", label: "Hazır" },
  { value: "done", label: "Alınan" },
  { value: "all", label: "Tümü" },
]

function GoalCard({ goal, display, rates }: { goal: GoalRow; display: string; rates: RateMap }) {
  const [edit, setEdit] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [contribute, setContribute] = React.useState(false)
  const [buy, setBuy] = React.useState(false)
  const [, start] = React.useTransition()

  const paid = (goal.baseTargetAmount ?? 0) > 0
  const fmt = (v: number | null | undefined) => formatBase(v, display, rates)

  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20",
        goal.status === "done" && "opacity-70",
        goal.funded && goal.status === "open" && "border-emerald-500/35 bg-emerald-500/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate font-medium", goal.status === "done" && "line-through")}>{goal.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{labelOf(GOAL_TYPE, goal.type)}</span>
            {goal.targetDate && <span>· {relativeDay(goal.targetDate)}</span>}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">İşlemler</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => setEdit(true)}>
              <Pencil className="size-4" /> Düzenle
            </DropdownMenuItem>
            {paid && goal.status === "open" && (
              <DropdownMenuItem onSelect={() => setContribute(true)}>
                <PiggyBank className="size-4" /> Kumbaraya ekle
              </DropdownMenuItem>
            )}
            {goal.status === "open" ? (
              <>
                <DropdownMenuItem onSelect={() => setBuy(true)}>
                  <Check className="size-4" /> Satın aldım
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => start(() => setGoalStatus(goal.id, "dropped"))}>
                  Vazgeçtim
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => start(() => setGoalStatus(goal.id, "open"))}>
                <Undo2 className="size-4" /> Tekrar aç
              </DropdownMenuItem>
            )}
            {goal.saved > 0 && (
              <DropdownMenuItem
                onSelect={() =>
                  start(async () => {
                    await withdrawAll(goal.id)
                    toast.success("Kumbara boşaltıldı, para serbest")
                  })
                }
              >
                Kumbarayı boşalt
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
              <Trash2 className="size-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {goal.url && (
        <a
          href={goal.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{goal.url.replace(/^https?:\/\//, "")}</span>
        </a>
      )}

      {goal.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{goal.notes}</p>}

      {paid ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="tabular font-medium">{fmt(goal.saved)}</span>
            <span className="text-xs text-muted-foreground">
              / {fmt(goal.baseTargetAmount)}
              {goal.currency !== display && (
                <span className="ml-1">({money(goal.targetAmount, goal.currency)})</span>
              )}
            </span>
          </div>
          <Progress value={goal.progress ?? 0} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {goal.funded ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Hedefe ulaşıldı</span>
            ) : (
              <>%{goal.progress ?? 0} · {fmt(goal.remaining)} kaldı</>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Ücretsiz / fiyat girilmedi</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <StatusBadge options={GOAL_STATUS} value={goal.status} />
        {paid && goal.status === "open" && (
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setContribute(true)}>
            <Plus className="size-3.5" /> Para ekle
          </Button>
        )}
        {goal.status === "done" && goal.completedAt && (
          <span className="text-xs text-muted-foreground">{formatDate(goal.completedAt)}</span>
        )}
      </div>

      <GoalDialog goal={goal} open={edit} onOpenChange={setEdit} />
      <ContributionDialog
        goalId={goal.id}
        goalTitle={goal.title}
        defaultCurrency={goal.currency}
        open={contribute}
        onOpenChange={setContribute}
      />
      <ConfirmDialog
        open={buy}
        onOpenChange={setBuy}
        onConfirm={() => purchaseGoal(goal.id)}
        title="Satın alındı olarak işaretle?"
        description={
          paid
            ? `${goal.title} için ${fmt(goal.baseTargetAmount)} tutarında bir gider kaydı oluşturulacak ve kumbara boşaltılacak.`
            : `${goal.title} tamamlandı olarak işaretlenecek.`
        }
        confirmLabel="Satın aldım"
        successMessage="Tamamlandı"
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deleteGoal(goal.id)}
        title="Hedef silinsin mi?"
        description={`${goal.title} ve kumbarasındaki kayıtlar silinir.`}
      />
    </div>
  )
}

export function GoalsClient({
  goals,
  display,
  rates,
  available,
}: {
  goals: GoalRow[]
  display: string
  rates: RateMap
  available: number
}) {
  const [newOpen, setNewOpen] = useNewParam("goal")
  const [q, setQ] = React.useState("")
  const [filter, setFilter] = React.useState("open")

  const fmt = (v: number) => formatBase(v, display, rates)
  const open = goals.filter((g) => g.status === "open")
  const reserved = open.reduce((a, g) => a + g.saved, 0)
  const needed = open.reduce((a, g) => a + g.remaining, 0)
  const funded = open.filter((g) => g.funded)

  const filtered = goals.filter((g) => {
    if (filter === "open" && g.status !== "open") return false
    if (filter === "funded" && !(g.status === "open" && g.funded)) return false
    if (filter === "done" && g.status !== "done") return false
    if (q && !`${g.title} ${g.notes ?? ""} ${g.url ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hedefler"
        description="İstek listesi ve kumbaralar"
        actions={
          <GoalDialog
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni hedef
              </Button>
            }
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kumbaralarda biriken" value={fmt(reserved)} icon={PiggyBank} accent="positive" />
        <StatCard label="Kalan ihtiyaç" value={fmt(needed)} icon={Target} hint={`${open.length} açık hedef`} />
        <StatCard
          label="Alınmaya hazır"
          value={String(funded.length)}
          icon={Sparkles}
          accent={funded.length > 0 ? "positive" : undefined}
          hint="hedefe ulaşan"
        />
        <StatCard
          label="Serbest bakiye"
          value={fmt(available)}
          icon={BookOpen}
          accent={available >= 0 ? undefined : "negative"}
          hint="net kâr − bloke"
        />
      </div>

      {funded.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 sm:flex-row sm:items-center">
          <Sparkles className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="flex-1 text-sm">
            <span className="font-medium">{funded.length} hedef için para hazır:</span>{" "}
            <span className="text-muted-foreground">{funded.map((g) => g.title).join(", ")}</span>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hedeflerde ara…"
          className="h-9 sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-1 rounded-lg border p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Target}
          title={goals.length === 0 ? "Henüz hedef yok" : "Eşleşen hedef yok"}
          description={
            goals.length === 0
              ? "Almak istediğin bir abonelik, kitap veya cihazı ekle. Fiyat girersen kumbara açılır; gelir eklerken bu kumbaraya pay ayırabilirsin."
              : "Filtreyi değiştirmeyi dene."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} display={display} rates={rates} />
          ))}
        </div>
      )}
    </div>
  )
}
