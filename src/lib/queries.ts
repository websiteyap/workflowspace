import "server-only"
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm"
import { db, ready } from "@/db"
import { clients, notes, payments, projects, tasks, transactions } from "@/db/schema"
import { monthRange, todayISO } from "./format"

export async function lookups() {
  await ready()
  const [c, p] = await Promise.all([
    db.select({ value: clients.id, label: clients.name }).from(clients).orderBy(asc(clients.name)),
    db
      .select({ value: projects.id, label: projects.name })
      .from(projects)
      .where(ne(projects.status, "cancelled"))
      .orderBy(asc(projects.name)),
  ])
  return { clients: c, projects: p }
}

export async function searchIndex() {
  await ready()
  const [c, p, n] = await Promise.all([
    db.select({ id: clients.id, label: clients.name, sub: clients.company }).from(clients).limit(100),
    db.select({ id: projects.id, label: projects.name }).from(projects).limit(100),
    db.select({ id: notes.id, label: notes.title, sub: notes.tags }).from(notes).limit(100),
  ])
  return [
    ...c.map((x) => ({
      id: `c-${x.id}`,
      label: x.label,
      sub: x.sub ?? undefined,
      href: `/musteriler/${x.id}`,
      group: "Müşteriler",
    })),
    ...p.map((x) => ({
      id: `p-${x.id}`,
      label: x.label,
      sub: undefined,
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

const sumAmount = sql<number>`coalesce(sum(${transactions.amount}), 0)`
const sumPayment = sql<number>`coalesce(sum(${payments.amount}), 0)`

export async function dashboardData() {
  await ready()
  const today = todayISO()
  const cur = monthRange(0)
  const prev = monthRange(-1)
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [
    todayTasks,
    overdueTasks,
    upcomingPayments,
    overduePayments,
    curMonth,
    prevMonth,
    activeProjects,
    pinnedNotes,
    activeClientCount,
    activeProjectCount,
    openTaskCount,
    receivables,
    weekDone,
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
      .select({ payment: payments, clientName: clients.name })
      .from(payments)
      .leftJoin(clients, eq(payments.clientId, clients.id))
      .where(and(eq(payments.status, "pending"), gte(payments.dueDate, today)))
      .orderBy(asc(payments.dueDate))
      .limit(6),
    db
      .select({ payment: payments, clientName: clients.name })
      .from(payments)
      .leftJoin(clients, eq(payments.clientId, clients.id))
      .where(and(eq(payments.status, "pending"), sql`${payments.dueDate} < ${today}`))
      .orderBy(asc(payments.dueDate)),
    db
      .select({ type: transactions.type, total: sumAmount })
      .from(transactions)
      .where(and(gte(transactions.date, cur.start), lte(transactions.date, cur.end)))
      .groupBy(transactions.type),
    db
      .select({ type: transactions.type, total: sumAmount })
      .from(transactions)
      .where(and(gte(transactions.date, prev.start), lte(transactions.date, prev.end)))
      .groupBy(transactions.type),
    db
      .select({ project: projects, clientName: clients.name })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(inArray(projects.status, ["active", "planned"]))
      .orderBy(asc(projects.dueDate))
      .limit(6),
    db.select().from(notes).where(eq(notes.pinned, 1)).orderBy(desc(notes.updatedAt)).limit(4),
    db.select({ n: count() }).from(clients).where(eq(clients.status, "active")),
    db.select({ n: count() }).from(projects).where(eq(projects.status, "active")),
    db.select({ n: count() }).from(tasks).where(ne(tasks.status, "done")),
    db
      .select({ total: sumPayment })
      .from(payments)
      .where(and(eq(payments.status, "pending"), eq(payments.direction, "incoming"))),
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.status, "done"), isNotNull(tasks.completedAt), gte(tasks.completedAt, weekAgo))),
  ])

  const pick = (rows: { type: string; total: number }[], t: string) =>
    Number(rows.find((r) => r.type === t)?.total ?? 0)

  return {
    today,
    monthLabel: cur.label,
    todayTasks,
    overdueTasks,
    upcomingPayments,
    overduePayments,
    income: pick(curMonth, "income"),
    expense: pick(curMonth, "expense"),
    prevIncome: pick(prevMonth, "income"),
    prevExpense: pick(prevMonth, "expense"),
    activeProjects,
    pinnedNotes,
    activeClients: activeClientCount[0]?.n ?? 0,
    openProjects: activeProjectCount[0]?.n ?? 0,
    openTasks: openTaskCount[0]?.n ?? 0,
    receivable: Number(receivables[0]?.total ?? 0),
    weekDone: weekDone[0]?.n ?? 0,
  }
}

export async function cashflowSeries(months = 6) {
  await ready()
  const start = monthRange(-(months - 1)).start
  const rows = await db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      type: transactions.type,
      total: sumAmount,
    })
    .from(transactions)
    .where(gte(transactions.date, start))
    .groupBy(sql`substr(${transactions.date}, 1, 7)`, transactions.type)

  const out: { month: string; label: string; income: number; expense: number; net: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const r = monthRange(-i)
    const key = r.start.slice(0, 7)
    const income = Number(rows.find((x) => x.month === key && x.type === "income")?.total ?? 0) / 100
    const expense = Number(rows.find((x) => x.month === key && x.type === "expense")?.total ?? 0) / 100
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
    .select({ category: transactions.category, total: sumAmount })
    .from(transactions)
    .where(and(eq(transactions.type, type), gte(transactions.date, from), lte(transactions.date, to)))
    .groupBy(transactions.category)
  return rows.map((r) => ({ category: r.category, total: Number(r.total) })).sort((a, b) => b.total - a.total)
}

export async function clientsWithStats() {
  await ready()
  const rows = await db
    .select({
      client: clients,
      projectCount: sql<number>`(select count(*) from projects p where p.client_id = ${clients.id})`,
      activeProjects: sql<number>`(select count(*) from projects p where p.client_id = ${clients.id} and p.status = 'active')`,
      earned: sql<number>`(select coalesce(sum(t.amount),0) from transactions t where t.client_id = ${clients.id} and t.type = 'income')`,
      pending: sql<number>`(select coalesce(sum(pm.amount),0) from payments pm where pm.client_id = ${clients.id} and pm.status = 'pending' and pm.direction = 'incoming')`,
    })
    .from(clients)
    .orderBy(asc(clients.name))
  return rows.map((r) => ({
    ...r.client,
    projectCount: Number(r.projectCount),
    activeProjects: Number(r.activeProjects),
    earned: Number(r.earned),
    pending: Number(r.pending),
  }))
}

export async function clientDetail(id: string) {
  await ready()
  const [client] = await db.select().from(clients).where(eq(clients.id, id))
  if (!client) return null
  const [clientProjects, clientPayments, clientTx, clientNotes] = await Promise.all([
    db.select().from(projects).where(eq(projects.clientId, id)).orderBy(desc(projects.updatedAt)),
    db.select().from(payments).where(eq(payments.clientId, id)).orderBy(desc(payments.dueDate)),
    db.select().from(transactions).where(eq(transactions.clientId, id)).orderBy(desc(transactions.date)).limit(30),
    db.select().from(notes).where(eq(notes.clientId, id)).orderBy(desc(notes.updatedAt)).limit(10),
  ])
  const earned = clientTx.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0)
  const pending = clientPayments
    .filter((p) => p.status === "pending" && p.direction === "incoming")
    .reduce((a, b) => a + b.amount, 0)
  return {
    client,
    projects: clientProjects,
    payments: clientPayments,
    transactions: clientTx,
    notes: clientNotes,
    earned,
    pending,
  }
}

export async function projectsWithClient() {
  await ready()
  const rows = await db
    .select({
      project: projects,
      clientName: clients.name,
      openTasks: sql<number>`(select count(*) from tasks t where t.project_id = ${projects.id} and t.status != 'done')`,
      doneTasks: sql<number>`(select count(*) from tasks t where t.project_id = ${projects.id} and t.status = 'done')`,
      earned: sql<number>`(select coalesce(sum(t.amount),0) from transactions t where t.project_id = ${projects.id} and t.type = 'income')`,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .orderBy(desc(projects.updatedAt))
  return rows.map((r) => ({
    ...r.project,
    clientName: r.clientName,
    openTasks: Number(r.openTasks),
    doneTasks: Number(r.doneTasks),
    earned: Number(r.earned),
  }))
}

export async function projectDetail(id: string) {
  await ready()
  const [row] = await db
    .select({ project: projects, clientName: clients.name })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, id))
  if (!row) return null
  const [projectTasks, projectPayments, projectTx, projectNotes] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, id)).orderBy(asc(tasks.status), asc(tasks.dueDate)),
    db.select().from(payments).where(eq(payments.projectId, id)).orderBy(asc(payments.dueDate)),
    db.select().from(transactions).where(eq(transactions.projectId, id)).orderBy(desc(transactions.date)),
    db.select().from(notes).where(eq(notes.projectId, id)).orderBy(desc(notes.updatedAt)),
  ])
  const earned = projectTx.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0)
  const spent = projectTx.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0)
  const pending = projectPayments.filter((p) => p.status === "pending").reduce((a, b) => a + b.amount, 0)
  return {
    project: row.project,
    clientName: row.clientName,
    tasks: projectTasks,
    payments: projectPayments,
    transactions: projectTx,
    notes: projectNotes,
    earned,
    spent,
    pending,
  }
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
    .select({ note: notes, projectName: projects.name, clientName: clients.name })
    .from(notes)
    .leftJoin(projects, eq(notes.projectId, projects.id))
    .leftJoin(clients, eq(notes.clientId, clients.id))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
  return rows.map((r) => ({ ...r.note, projectName: r.projectName, clientName: r.clientName }))
}

export async function paymentsList() {
  await ready()
  const today = todayISO()
  const rows = await db
    .select({ payment: payments, clientName: clients.name, projectName: projects.name })
    .from(payments)
    .leftJoin(clients, eq(payments.clientId, clients.id))
    .leftJoin(projects, eq(payments.projectId, projects.id))
    .orderBy(asc(payments.dueDate))
  return rows.map((r) => ({
    ...r.payment,
    clientName: r.clientName,
    projectName: r.projectName,
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
    .select({ tx: transactions, clientName: clients.name, projectName: projects.name })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(300)
  return rows.map((r) => ({ ...r.tx, clientName: r.clientName, projectName: r.projectName }))
}

export async function financeSummary(from: string, to: string) {
  await ready()
  const rows = await db
    .select({ type: transactions.type, total: sumAmount, n: count() })
    .from(transactions)
    .where(and(gte(transactions.date, from), lte(transactions.date, to)))
    .groupBy(transactions.type)
  const income = Number(rows.find((r) => r.type === "income")?.total ?? 0)
  const expense = Number(rows.find((r) => r.type === "expense")?.total ?? 0)
  return { income, expense, net: income - expense, count: rows.reduce((a, b) => a + Number(b.n), 0) }
}

export async function dataCounts() {
  await ready()
  const [c] = await db.select({ n: count() }).from(clients)
  const [p] = await db.select({ n: count() }).from(projects)
  const [t] = await db.select({ n: count() }).from(tasks)
  const [n] = await db.select({ n: count() }).from(notes)
  const [pm] = await db.select({ n: count() }).from(payments)
  const [tx] = await db.select({ n: count() }).from(transactions)
  return {
    clients: c?.n ?? 0,
    projects: p?.n ?? 0,
    tasks: t?.n ?? 0,
    notes: n?.n ?? 0,
    payments: pm?.n ?? 0,
    transactions: tx?.n ?? 0,
  }
}
