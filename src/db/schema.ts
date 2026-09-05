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

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    type: text("type").notNull().default("other"),
    url: text("url"),
    notes: text("notes"),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("medium"),
    targetAmount: integer("target_amount"),
    currency: text("currency").notNull().default("TRY"),
    baseTargetAmount: integer("base_target_amount"),
    fxRate: text("fx_rate"),
    targetDate: text("target_date"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [index("goals_status_idx").on(t.status)],
)

export const goalContributions = sqliteTable(
  "goal_contributions",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TRY"),
    baseAmount: integer("base_amount").notNull().default(0),
    fxRate: text("fx_rate"),
    date: text("date").notNull(),
    source: text("source").notNull().default("manual"),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("contrib_goal_idx").on(t.goalId), index("contrib_tx_idx").on(t.transactionId)],
)

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary"),
    sessionId: text("session_id"),
    ip: text("ip"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
)

export const errorLog = sqliteTable(
  "error_log",
  {
    id: text("id").primaryKey(),
    message: text("message").notNull(),
    stack: text("stack"),
    context: text("context"),
    level: text("level").notNull().default("error"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("error_created_idx").on(t.createdAt)],
)

export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: text("reset_at").notNull(),
})

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(now),
})

export const portfolioSnapshots = sqliteTable("portfolio_snapshots", {
  date: text("date").primaryKey(),
  valueBase: integer("value_base").notNull(),
  costBase: integer("cost_base").notNull(),
  createdAt: text("created_at").notNull().default(now),
})

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: text("id").primaryKey(),
    coinId: text("coin_id").notNull(),
    date: text("date").notNull(),
    priceUsd: text("price_usd").notNull(),
  },
  (t) => [index("price_history_coin_idx").on(t.coinId, t.date)],
)

export const wallets = sqliteTable("wallets", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  chain: text("chain").notNull().default("ethereum"),
  address: text("address").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now),
})

export const holdings = sqliteTable(
  "holdings",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().default("crypto"),
    coinId: text("coin_id"),
    symbol: text("symbol").notNull(),
    name: text("name"),
    amount: text("amount").notNull().default("0"),
    costBasis: integer("cost_basis"),
    currency: text("currency").notNull().default("TRY"),
    baseCost: integer("base_cost"),
    manualPrice: integer("manual_price"),
    walletId: text("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [index("holdings_kind_idx").on(t.kind)],
)

export const priceCache = sqliteTable("price_cache", {
  coinId: text("coin_id").primaryKey(),
  symbol: text("symbol").notNull(),
  priceUsd: text("price_usd").notNull(),
  priceTry: text("price_try").notNull(),
  change24h: text("change_24h"),
  updatedAt: text("updated_at").notNull(),
})

export const alertRules = sqliteTable(
  "alert_rules",
  {
    id: text("id").primaryKey(),
    coinId: text("coin_id").notNull(),
    symbol: text("symbol").notNull(),
    kind: text("kind").notNull(),
    threshold: text("threshold").notNull(),
    enabled: integer("enabled").notNull().default(1),
    note: text("note"),
    lastFiredAt: text("last_fired_at"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("alert_rules_enabled_idx").on(t.enabled)],
)

export const alertEvents = sqliteTable(
  "alert_events",
  {
    id: text("id").primaryKey(),
    ruleId: text("rule_id").references(() => alertRules.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    level: text("level").notNull().default("info"),
    readAt: text("read_at"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("alert_events_read_idx").on(t.readAt)],
)

export const fxRates = sqliteTable("fx_rates", {
  date: text("date").primaryKey(),
  base: text("base").notNull(),
  rates: text("rates").notNull(),
  source: text("source"),
  fetchedAt: text("fetched_at").notNull(),
})

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    createdAt: text("created_at").notNull().default(now),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at"),
    userAgent: text("user_agent"),
    ip: text("ip"),
    revokedAt: text("revoked_at"),
  },
  (t) => [index("sessions_expires_idx").on(t.expiresAt)],
)

export const vaultItems = sqliteTable("vault_items", {
  id: text("id").primaryKey(),
  cipher: text("cipher").notNull(),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
})

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export type FxRateRow = typeof fxRates.$inferSelect
export type AuditEntry = typeof auditLog.$inferSelect
export type ErrorEntry = typeof errorLog.$inferSelect
export type Wallet = typeof wallets.$inferSelect
export type Holding = typeof holdings.$inferSelect
export type AlertRule = typeof alertRules.$inferSelect
export type AlertEvent = typeof alertEvents.$inferSelect
export type Session = typeof sessions.$inferSelect
export type VaultItem = typeof vaultItems.$inferSelect
export type Goal = typeof goals.$inferSelect
export type GoalContribution = typeof goalContributions.$inferSelect
export type Project = typeof projects.$inferSelect
export type ProjectDomain = typeof projectDomains.$inferSelect
export type ProjectItem = typeof projectItems.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Note = typeof notes.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Transaction = typeof transactions.$inferSelect
