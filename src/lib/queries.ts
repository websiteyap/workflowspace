import "server-only"
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm"
import { db, ready } from "@/db"
import {
  goalContributions,
  goals,
  notes,
  payments,
  projectDomains,
  projectItems,
  projects,
  tasks,
  transactions,
} from "@/db/schema"
import { CYCLE_MONTHS } from "./constants"
import { monthRange, todayISO } from "./format"

const sumTx = sql<number>`coalesce(sum(${transactions.baseAmount}), 0)`
const sumPay = sql<number>`coalesce(sum(${payments.baseAmount}), 0)`

export async function lookups() {
  await ready()
  const [rows, goalRows] = await Promise.all([
    db
      .select({ value: projects.id, label: projects.name, clientName: projects.clientName })
      .from(projects)
      .where(ne(projects.status, "cancelled"))
      .orderBy(asc(projects.name)),
    db
      .select({ value: goals.id, label: goals.title })
      .from(goals)
      .where(eq(goals.status, "open"))
      .orderBy(asc(goals.title)),
  ])
  return {
    projects: rows.map((r) => ({
      value: r.value,
      label: r.clientName ? `${r.label} — ${r.clientName}` : r.label,
    })),
    goals: goalRows,
  }
}

export async function searchIndex() {
  await ready()
  const [p, n] = await Promise.all([
    db
      .select({ id: projects.id, label: projects.name, sub: projects.clientName })
      .from(projects)
      .limit(150),
    db.select({ id: notes.id, label: notes.title, sub: notes.tags }).from(notes).limit(100),
  ])
  return [
    ...p.map((x) => ({
      id: `p-${x.id}`,
      label: x.label,
      sub: x.sub ?? undefined,
      href: `/projeler/${x.id}`,
      group: "Projeler",
    })),
    ...n.map((x) => ({
      id: `n-${x.id}`,
      label: x.label,
      sub: x.sub ?? undefined,
      href: "/notlar",
      group: "Notlar",
    })),
  ]
}

function monthlyValue(price: number | null, cycle: string) {
  const months = CYCLE_MONTHS[cycle] ?? 0
  if (!price || months === 0) return 0
  return Math.round(price / months)
}

export async function projectsOverview() {
  await ready()
  const today = todayISO()

  const rows = await db
    .select({
      project: projects,
      openTasks: sql<number>`(select count(*) from tasks t where t.project_id = ${projects.id} and t.status != 'done')`,
      doneTasks: sql<number>`(select count(*) from tasks t where t.project_id = ${projects.id} and t.status = 'done')`,
      earned: sql<number>`(select coalesce(sum(t.base_amount),0) from transactions t where t.project_id = ${projects.id} and t.type = 'income')`,
      spent: sql<number>`(select coalesce(sum(t.base_amount),0) from transactions t where t.project_id = ${projects.id} and t.type = 'expense')`,
      recurringCharges: sql<number>`(select coalesce(sum(i.base_amount),0) from project_items i where i.project_id = ${projects.id} and i.recurring = 1 and i.kind = 'charge')`,
      recurringCosts: sql<number>`(select coalesce(sum(i.base_amount),0) from project_items i where i.project_id = ${projects.id} and i.recurring = 1 and i.kind = 'cost')`,
      domainCount: sql<number>`(select count(*) from project_domains d where d.project_id = ${projects.id})`,
      primaryDomain: sql<string | null>`(select d.host from project_domains d where d.project_id = ${projects.id} order by d.is_primary desc limit 1)`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt))

  return rows.map((r) => {
    const base = r.project.basePrice ?? 0
    const charges = Number(r.recurringCharges)
    const costs = Number(r.recurringCosts)
    const cycleRevenue = base + charges
    return {
      ...r.project,
      openTasks: Number(r.openTasks),
      doneTasks: Number(r.doneTasks),
      earned: Number(r.earned),
      spent: Number(r.spent),
      recurringCharges: charges,
      recurringCosts: costs,
      cycleRevenue,
      cycleNet: cycleRevenue - costs,
      monthlyRevenue: monthlyValue(cycleRevenue, r.project.billingCycle),
      monthlyNet: monthlyValue(cycleRevenue - costs, r.project.billingCycle),
      domainCount: Number(r.domainCount),
      primaryDomain: r.primaryDomain,
      paymentDue:
        r.project.nextPaymentDate && r.project.status === "active" ? r.project.nextPaymentDate <= today : false,
    }
  })
}

export type ProjectOverviewRow = Awaited<ReturnType<typeof projectsOverview>>[number]

export async function projectDetail(id: string) {
  await ready()
  const [project] = await db.select().from(projects).where(eq(projects.id, id))
  if (!project) return null

  const [domains, items, projectTasks, projectPayments, projectTx, projectNotes] = await Promise.all([
    db.select().from(projectDomains).where(eq(projectDomains.projectId, id)).orderBy(desc(projectDomains.isPrimary)),
    db.select().from(projectItems).where(eq(projectItems.projectId, id)).orderBy(desc(projectItems.createdAt)),
    db.select().from(tasks).where(eq(tasks.projectId, id)).orderBy(asc(tasks.status), asc(tasks.dueDate)),
    db.select().from(payments).where(eq(payments.projectId, id)).orderBy(asc(payments.dueDate)),
    db.select().from(transactions).where(eq(transactions.projectId, id)).orderBy(desc(transactions.date)),
    db.select().from(notes).where(eq(notes.projectId, id)).orderBy(desc(notes.updatedAt)),
  ])

  const earned = projectTx.filter((t) => t.type === "income").reduce((a, b) => a + b.baseAmount, 0)
  const spent = projectTx.filter((t) => t.type === "expense").reduce((a, b) => a + b.baseAmount, 0)
  const oneOffCosts = items
    .filter((i) => i.recurring === 0 && i.kind === "cost")
    .reduce((a, b) => a + b.baseAmount, 0)
  const oneOffCharges = items
    .filter((i) => i.recurring === 0 && i.kind === "charge")
    .reduce((a, b) => a + b.baseAmount, 0)
  const recurringCharges = items
    .filter((i) => i.recurring === 1 && i.kind === "charge")
    .reduce((a, b) => a + b.baseAmount, 0)
  const recurringCosts = items
    .filter((i) => i.recurring === 1 && i.kind === "cost")
    .reduce((a, b) => a + b.baseAmount, 0)

  const cycleRevenue = (project.basePrice ?? 0) + recurringCharges
  const pending = projectPayments.filter((p) => p.status === "pending").reduce((a, b) => a + b.baseAmount, 0)

  const monthly = new Map<string, { income: number; expense: number }>()
  for (const t of projectTx) {
    const key = t.date.slice(0, 7)
    const entry = monthly.get(key) ?? { income: 0, expense: 0 }
    if (t.type === "income") entry.income += t.baseAmount
    else entry.expense += t.baseAmount
    monthly.set(key, entry)
  }
  const series: { month: string; label: string; income: number; expense: number; net: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const r = monthRange(-i)
    const key = r.start.slice(0, 7)
    const entry = monthly.get(key) ?? { income: 0, expense: 0 }
    series.push({
      month: key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString("tr-TR", { month: "short" }),
      income: entry.income,
      expense: entry.expense,
      net: entry.income - entry.expense,
    })
  }

  return {
    project,
    domains,
    items,
    tasks: projectTasks,
    payments: projectPayments,
    transactions: projectTx,
    notes: projectNotes,
    earned,
    spent,
    pending,
    oneOffCosts,
    oneOffCharges,
    recurringCharges,
    recurringCosts,
    cycleRevenue,
    cycleNet: cycleRevenue - recurringCosts,
    monthlyRevenue: monthlyValue(cycleRevenue, project.billingCycle),
    series,
  }
}

export async function dashboardData() {
  await ready()
  const today = todayISO()
  const cur = monthRange(0)
  const prev = monthRange(-1)
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

  const [
    todayTasks,
    overdueTasks,
    upcomingPayments,
    overduePayments,
    curMonth,
    prevMonth,
    activeProjects,
    duePayments,
    pinnedNotes,
    activeProjectCount,
    openTaskCount,
    receivables,
    weekDone,
    expiringDomains,
  ] = await Promise.all([
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.dueDate, today), ne(tasks.status, "done")))
      .orderBy(asc(tasks.position)),
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(sql`${tasks.dueDate} < ${today}`, ne(tasks.status, "done")))
      .orderBy(asc(tasks.dueDate))
      .limit(8),
    db
      .select({ payment: payments, projectName: projects.name })
      .from(payments)
      .leftJoin(projects, eq(payments.projectId, projects.id))
      .where(and(eq(payments.status, "pending"), gte(payments.dueDate, today)))
      .orderBy(asc(payments.dueDate))
      .limit(6),
    db
      .select({ payment: payments, projectName: projects.name })
      .from(payments)
      .leftJoin(projects, eq(payments.projectId, projects.id))
      .where(and(eq(payments.status, "pending"), sql`${payments.dueDate} < ${today}`))
      .orderBy(asc(payments.dueDate)),
    db
      .select({ type: transactions.type, total: sumTx })
      .from(transactions)
      .where(and(gte(transactions.date, cur.start), lte(transactions.date, cur.end)))
      .groupBy(transactions.type),
    db
      .select({ type: transactions.type, total: sumTx })
      .from(transactions)
      .where(and(gte(transactions.date, prev.start), lte(transactions.date, prev.end)))
      .groupBy(transactions.type),
    db
      .select()
      .from(projects)
      .where(inArray(projects.status, ["active", "lead"]))
      .orderBy(asc(projects.nextPaymentDate))
      .limit(8),
    db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.status, "active"),
          isNotNull(projects.nextPaymentDate),
          lte(projects.nextPaymentDate, soon),
        ),
      )
      .orderBy(asc(projects.nextPaymentDate)),
    db.select().from(notes).where(eq(notes.pinned, 1)).orderBy(desc(notes.updatedAt)).limit(4),
    db.select({ n: count() }).from(projects).where(eq(projects.status, "active")),
    db.select({ n: count() }).from(tasks).where(ne(tasks.status, "done")),
    db
      .select({ total: sumPay })
      .from(payments)
      .where(and(eq(payments.status, "pending"), eq(payments.direction, "incoming"))),
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.status, "done"), isNotNull(tasks.completedAt), gte(tasks.completedAt, weekAgo))),
    db
      .select({ domain: projectDomains, projectName: projects.name })
      .from(projectDomains)
      .leftJoin(projects, eq(projectDomains.projectId, projects.id))
      .where(and(isNotNull(projectDomains.expiresAt), lte(projectDomains.expiresAt, soon)))
      .orderBy(asc(projectDomains.expiresAt))
      .limit(5),
  ])

  const pick = (rows: { type: string; total: number }[], t: string) =>
    Number(rows.find((r) => r.type === t)?.total ?? 0)

  const recurring = await db
    .select({
      projectId: projectItems.projectId,
      kind: projectItems.kind,
      total: sql<number>`coalesce(sum(${projectItems.baseAmount}), 0)`,
    })
    .from(projectItems)
    .where(eq(projectItems.recurring, 1))
    .groupBy(projectItems.projectId, projectItems.kind)

  let mrr = 0
  for (const project of activeProjects) {
    if (project.status !== "active") continue
    const months = CYCLE_MONTHS[project.billingCycle] ?? 0
    if (months === 0) continue
    const charges = Number(
      recurring.find((r) => r.projectId === project.id && r.kind === "charge")?.total ?? 0,
    )
    mrr += Math.round(((project.basePrice ?? 0) + charges) / months)
  }

  return {
    today,
    monthLabel: cur.label,
    todayTasks,
    overdueTasks,
    upcomingPayments,
    overduePayments,
    duePayments,
    expiringDomains,
    income: pick(curMonth, "income"),
    expense: pick(curMonth, "expense"),
    prevIncome: pick(prevMonth, "income"),
    prevExpense: pick(prevMonth, "expense"),
    activeProjects,
    pinnedNotes,
    openProjects: activeProjectCount[0]?.n ?? 0,
    openTasks: openTaskCount[0]?.n ?? 0,
    receivable: Number(receivables[0]?.total ?? 0),
    weekDone: weekDone[0]?.n ?? 0,
    mrr,
  }
}

export async function cashflowSeries(months = 6) {
  await ready()
  const start = monthRange(-(months - 1)).start
  const rows = await db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      type: transactions.type,
      total: sumTx,
    })
    .from(transactions)
    .where(gte(transactions.date, start))
    .groupBy(sql`substr(${transactions.date}, 1, 7)`, transactions.type)

  const out: { month: string; label: string; income: number; expense: number; net: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const r = monthRange(-i)
    const key = r.start.slice(0, 7)
    const income = Number(rows.find((x) => x.month === key && x.type === "income")?.total ?? 0)
    const expense = Number(rows.find((x) => x.month === key && x.type === "expense")?.total ?? 0)
    out.push({
      month: key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString("tr-TR", { month: "short" }),
      income,
      expense,
      net: income - expense,
    })
  }
  return out
}

export async function categoryBreakdown(type: "income" | "expense", from: string, to: string) {
  await ready()
  const rows = await db
    .select({ category: transactions.category, total: sumTx })
    .from(transactions)
    .where(and(eq(transactions.type, type), gte(transactions.date, from), lte(transactions.date, to)))
    .groupBy(transactions.category)
  return rows.map((r) => ({ category: r.category, total: Number(r.total) })).sort((a, b) => b.total - a.total)
}

export async function tasksBoard() {
  await ready()
  const rows = await db
    .select({ task: tasks, projectName: projects.name })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .orderBy(asc(tasks.dueDate), asc(tasks.position), desc(tasks.createdAt))
  return rows.map((r) => ({ ...r.task, projectName: r.projectName }))
}

export async function notesList() {
  await ready()
  const rows = await db
    .select({ note: notes, projectName: projects.name })
    .from(notes)
    .leftJoin(projects, eq(notes.projectId, projects.id))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
  return rows.map((r) => ({ ...r.note, projectName: r.projectName }))
}

export async function paymentsList() {
  await ready()
  const today = todayISO()
  const rows = await db
    .select({ payment: payments, projectName: projects.name, clientName: projects.clientName })
    .from(payments)
    .leftJoin(projects, eq(payments.projectId, projects.id))
    .orderBy(asc(payments.dueDate))
  return rows.map((r) => ({
    ...r.payment,
    projectName: r.projectName,
    clientName: r.clientName,
    isOverdue: r.payment.status === "pending" && r.payment.dueDate < today,
  }))
}

export async function transactionsList(opts?: { from?: string; to?: string; type?: string }) {
  await ready()
  const where = [
    opts?.from ? gte(transactions.date, opts.from) : undefined,
    opts?.to ? lte(transactions.date, opts.to) : undefined,
    opts?.type && opts.type !== "all" ? eq(transactions.type, opts.type) : undefined,
  ].filter(Boolean)
  const rows = await db
    .select({ tx: transactions, projectName: projects.name })
    .from(transactions)
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(300)
  return rows.map((r) => ({ ...r.tx, projectName: r.projectName }))
}

export async function financeSummary(from: string, to: string) {
  await ready()
  const rows = await db
    .select({ type: transactions.type, total: sumTx, n: count() })
    .from(transactions)
    .where(and(gte(transactions.date, from), lte(transactions.date, to)))
    .groupBy(transactions.type)
  const income = Number(rows.find((r) => r.type === "income")?.total ?? 0)
  const expense = Number(rows.find((r) => r.type === "expense")?.total ?? 0)
  return { income, expense, net: income - expense, count: rows.reduce((a, b) => a + Number(b.n), 0) }
}

export async function goalsList() {
  await ready()
  const rows = await db
    .select({
      goal: goals,
      saved: sql<number>`(select coalesce(sum(c.base_amount),0) from goal_contributions c where c.goal_id = ${goals.id})`,
      contributions: sql<number>`(select count(*) from goal_contributions c where c.goal_id = ${goals.id})`,
    })
    .from(goals)
    .orderBy(asc(goals.status), desc(goals.updatedAt))

  return rows.map((r) => {
    const saved = Number(r.saved)
    const target = r.goal.baseTargetAmount ?? 0
    return {
      ...r.goal,
      saved,
      contributions: Number(r.contributions),
      remaining: Math.max(0, target - saved),
      progress: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : null,
      funded: target > 0 && saved >= target,
    }
  })
}

export type GoalRow = Awaited<ReturnType<typeof goalsList>>[number]

export async function goalHistory(goalId: string) {
  await ready()
  return db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId))
    .orderBy(desc(goalContributions.date))
}

export async function reservedTotal() {
  await ready()
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${goalContributions.baseAmount}), 0)` })
    .from(goalContributions)
    .innerJoin(goals, eq(goalContributions.goalId, goals.id))
    .where(eq(goals.status, "open"))
  return Number(row?.total ?? 0)
}

export async function dataCounts() {
  await ready()
  const [p] = await db.select({ n: count() }).from(projects)
  const [t] = await db.select({ n: count() }).from(tasks)
  const [n] = await db.select({ n: count() }).from(notes)
  const [pm] = await db.select({ n: count() }).from(payments)
  const [tx] = await db.select({ n: count() }).from(transactions)
  const [d] = await db.select({ n: count() }).from(projectDomains)
  const [g] = await db.select({ n: count() }).from(goals)
  return {
    goals: g?.n ?? 0,
    projects: p?.n ?? 0,
    tasks: t?.n ?? 0,
    notes: n?.n ?? 0,
    payments: pm?.n ?? 0,
    transactions: tx?.n ?? 0,
    domains: d?.n ?? 0,
  }
}
