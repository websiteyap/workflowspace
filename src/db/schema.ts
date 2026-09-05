import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    taxOffice: text("tax_office"),
    taxNumber: text("tax_number"),
    
    status: text("status").notNull().default("active"),
    currency: text("currency").notNull().default("TRY"),
    
    hourlyRate: integer("hourly_rate"),
    notes: text("notes"),
    color: text("color"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [index("clients_status_idx").on(t.status)],
)

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    
    status: text("status").notNull().default("active"),
    
    priority: text("priority").notNull().default("medium"),
    
    billingType: text("billing_type").notNull().default("fixed"),
    budget: integer("budget"),
    hourlyRate: integer("hourly_rate"),
    currency: text("currency").notNull().default("TRY"),
    progress: integer("progress").notNull().default(0),
    startDate: text("start_date"),
    dueDate: text("due_date"),
    completedAt: text("completed_at"),
    repoUrl: text("repo_url"),
    liveUrl: text("live_url"),
    stack: text("stack"),
    tags: text("tags"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [index("projects_status_idx").on(t.status), index("projects_client_idx").on(t.clientId)],
)

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
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
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
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
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    
    direction: text("direction").notNull().default("incoming"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TRY"),
    
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
    category: text("category").notNull().default("other"),
    description: text("description"),
    
    date: text("date").notNull(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
    method: text("method"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("tx_date_idx").on(t.date), index("tx_type_idx").on(t.type)],
)

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export type Client = typeof clients.$inferSelect
export type Project = typeof projects.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Note = typeof notes.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Transaction = typeof transactions.$inferSelect
