import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    clientName: text("client_name"),
    clientCompany: text("client_company"),
    clientEmail: text("client_email"),
    clientPhone: text("client_phone"),
    status: text("status").notNull().default("active"),
    priority: text("priority").notNull().default("medium"),

    currency: text("currency").notNull().default("TRY"),
    price: integer("price"),
    basePrice: integer("base_price"),
    fxRate: text("fx_rate"),
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    startDate: text("start_date"),
    nextPaymentDate: text("next_payment_date"),
    lastPaymentDate: text("last_payment_date"),
    reminderDaysBefore: integer("reminder_days_before"),
    reminderSentFor: text("reminder_sent_for"),

    serverProvider: text("server_provider"),
    serverIp: text("server_ip"),
    serverNotes: text("server_notes"),
    cloudflareAccount: text("cloudflare_account"),
    lastMaintenanceAt: text("last_maintenance_at"),
    backupInfo: text("backup_info"),
    repoUrl: text("repo_url"),
    liveUrl: text("live_url"),
    stack: text("stack"),

    progress: integer("progress").notNull().default(0),
    dueDate: text("due_date"),
    completedAt: text("completed_at"),
    tags: text("tags"),
    description: text("description"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    index("projects_status_idx").on(t.status),
    index("projects_next_payment_idx").on(t.nextPaymentDate),
  ],
)

export const projectDomains = sqliteTable(
  "project_domains",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    registrar: text("registrar"),
    expiresAt: text("expires_at"),
    isPrimary: integer("is_primary").notNull().default(0),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("domains_project_idx").on(t.projectId)],
)

export const projectItems = sqliteTable(
  "project_items",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("cost"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TRY"),
    baseAmount: integer("base_amount").notNull().default(0),
    fxRate: text("fx_rate"),
    recurring: integer("recurring").notNull().default(0),
    date: text("date"),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("items_project_idx").on(t.projectId), index("items_recurring_idx").on(t.recurring)],
)

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("todo"),
    priority: text("priority").notNull().default("medium"),
    dueDate: text("due_date"),
    estimateMinutes: integer("estimate_minutes"),
    spentMinutes: integer("spent_minutes").notNull().default(0),
    remindAt: text("remind_at"),
    reminderFiredAt: text("reminder_fired_at"),
    position: integer("position").notNull().default(0),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    index("tasks_due_idx").on(t.dueDate),
    index("tasks_status_idx").on(t.status),
    index("tasks_remind_idx").on(t.remindAt),
  ],
)

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    tags: text("tags"),
    pinned: integer("pinned").notNull().default(0),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [index("notes_pinned_idx").on(t.pinned)],
)

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    direction: text("direction").notNull().default("incoming"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TRY"),
    baseAmount: integer("base_amount").notNull().default(0),
    fxRate: text("fx_rate"),
    status: text("status").notNull().default("pending"),
    issueDate: text("issue_date"),
    dueDate: text("due_date").notNull(),
    paidDate: text("paid_date"),
    invoiceNo: text("invoice_no"),
    method: text("method"),
    notes: text("notes"),
    recurrence: text("recurrence").notNull().default("none"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [index("payments_due_idx").on(t.dueDate), index("payments_status_idx").on(t.status)],
)

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TRY"),
    baseAmount: integer("base_amount").notNull().default(0),
    fxRate: text("fx_rate"),
    category: text("category").notNull().default("other"),
    description: text("description"),
    date: text("date").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
    method: text("method"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("tx_date_idx").on(t.date), index("tx_type_idx").on(t.type)],
)

export const fxRates = sqliteTable("fx_rates", {
  date: text("date").primaryKey(),
  base: text("base").notNull(),
  rates: text("rates").notNull(),
  source: text("source"),
  fetchedAt: text("fetched_at").notNull(),
})

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export type FxRateRow = typeof fxRates.$inferSelect
export type Project = typeof projects.$inferSelect
export type ProjectDomain = typeof projectDomains.$inferSelect
export type ProjectItem = typeof projectItems.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Note = typeof notes.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Transaction = typeof transactions.$inferSelect
