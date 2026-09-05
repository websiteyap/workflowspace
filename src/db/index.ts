import "server-only"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { type Client, createClient } from "@libsql/client"
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

const url = process.env.DATABASE_URL ?? "file:./data/source.db"
const SCHEMA_VERSION = "3"

const globalForDb = globalThis as unknown as {
  __sourceDbClient?: Client
  __sourceDbInstance?: LibSQLDatabase<typeof schema>
  __sourceDbReady?: Promise<void>
}

function ensureDataDirectory() {
  if (!url.startsWith("file:")) return
  const filePath = url.slice(5).replace(/^\/{2,}/, "/")
  mkdirSync(dirname(resolve(filePath)), { recursive: true })
}

function client(): Client {
  if (!globalForDb.__sourceDbClient) {
    ensureDataDirectory()
    globalForDb.__sourceDbClient = createClient({ url })
  }
  return globalForDb.__sourceDbClient
}

function instance(): LibSQLDatabase<typeof schema> {
  globalForDb.__sourceDbInstance ??= drizzle(client(), { schema })
  return globalForDb.__sourceDbInstance
}

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, property, receiver) {
    const value = Reflect.get(instance(), property, receiver)
    return typeof value === "function" ? value.bind(instance()) : value
  },
})

const DDL = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT,
    client_company TEXT,
    client_email TEXT,
    client_phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    priority TEXT NOT NULL DEFAULT 'medium',
    currency TEXT NOT NULL DEFAULT 'TRY',
    price INTEGER,
    base_price INTEGER,
    fx_rate TEXT,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    start_date TEXT,
    next_payment_date TEXT,
    last_payment_date TEXT,
    reminder_days_before INTEGER,
    reminder_sent_for TEXT,
    server_provider TEXT,
    server_ip TEXT,
    server_notes TEXT,
    cloudflare_account TEXT,
    last_maintenance_at TEXT,
    backup_info TEXT,
    repo_url TEXT,
    live_url TEXT,
    stack TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    completed_at TEXT,
    tags TEXT,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)`,
  `CREATE TABLE IF NOT EXISTS project_domains (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    host TEXT NOT NULL,
    registrar TEXT,
    expires_at TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS domains_project_idx ON project_domains(project_id)`,
  `CREATE TABLE IF NOT EXISTS project_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'cost',
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    base_amount INTEGER NOT NULL DEFAULT 0,
    fx_rate TEXT,
    recurring INTEGER NOT NULL DEFAULT 0,
    date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS items_project_idx ON project_items(project_id)`,
  `CREATE INDEX IF NOT EXISTS items_recurring_idx ON project_items(recurring)`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    estimate_minutes INTEGER,
    spent_minutes INTEGER NOT NULL DEFAULT 0,
    remind_at TEXT,
    reminder_fired_at TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_date)`,
  `CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status)`,
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS notes_pinned_idx ON notes(pinned)`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'incoming',
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    base_amount INTEGER NOT NULL DEFAULT 0,
    fx_rate TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    issue_date TEXT,
    due_date TEXT NOT NULL,
    paid_date TEXT,
    invoice_no TEXT,
    method TEXT,
    notes TEXT,
    recurrence TEXT NOT NULL DEFAULT 'none',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS payments_due_idx ON payments(due_date)`,
  `CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    base_amount INTEGER NOT NULL DEFAULT 0,
    fx_rate TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    date TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
    method TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    target_amount INTEGER,
    currency TEXT NOT NULL DEFAULT 'TRY',
    base_target_amount INTEGER,
    fx_rate TEXT,
    target_date TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS goals_status_idx ON goals(status)`,
  `CREATE TABLE IF NOT EXISTS goal_contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    base_amount INTEGER NOT NULL DEFAULT 0,
    fx_rate TEXT,
    date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    transaction_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS contrib_goal_idx ON goal_contributions(goal_id)`,
  `CREATE INDEX IF NOT EXISTS contrib_tx_idx ON goal_contributions(transaction_id)`,
  `CREATE TABLE IF NOT EXISTS fx_rates (
    date TEXT PRIMARY KEY,
    base TEXT NOT NULL,
    rates TEXT NOT NULL,
    source TEXT,
    fetched_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS tx_date_idx ON transactions(date)`,
  `CREATE INDEX IF NOT EXISTS tx_type_idx ON transactions(type)`,
]

const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ["tasks", "remind_at", "TEXT"],
  ["tasks", "reminder_fired_at", "TEXT"],
  ["projects", "client_name", "TEXT"],
  ["projects", "client_company", "TEXT"],
  ["projects", "client_email", "TEXT"],
  ["projects", "client_phone", "TEXT"],
  ["projects", "price", "INTEGER"],
  ["projects", "billing_cycle", "TEXT NOT NULL DEFAULT 'monthly'"],
  ["projects", "next_payment_date", "TEXT"],
  ["projects", "last_payment_date", "TEXT"],
  ["projects", "reminder_days_before", "INTEGER"],
  ["projects", "reminder_sent_for", "TEXT"],
  ["projects", "server_provider", "TEXT"],
  ["projects", "server_ip", "TEXT"],
  ["projects", "server_notes", "TEXT"],
  ["projects", "cloudflare_account", "TEXT"],
  ["projects", "last_maintenance_at", "TEXT"],
  ["projects", "backup_info", "TEXT"],
  ["projects", "base_price", "INTEGER"],
  ["projects", "fx_rate", "TEXT"],
  ["transactions", "base_amount", "INTEGER NOT NULL DEFAULT 0"],
  ["transactions", "fx_rate", "TEXT"],
  ["payments", "base_amount", "INTEGER NOT NULL DEFAULT 0"],
  ["payments", "fx_rate", "TEXT"],
]

async function tableExists(name: string) {
  const res = await client().execute({
    sql: `SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name = ?`,
    args: [name],
  })
  return Number(res.rows[0]?.n ?? 0) > 0
}

async function columnExists(table: string, column: string) {
  const res = await client().execute({
    sql: `SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?`,
    args: [table, column],
  })
  return Number(res.rows[0]?.n ?? 0) > 0
}

async function ensureColumn(table: string, column: string, definition: string) {
  if (!(await tableExists(table))) return
  if (await columnExists(table, column)) return
  await client().execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

async function readVersion() {
  if (!(await tableExists("settings"))) return "0"
  const res = await client().execute({
    sql: `SELECT value FROM settings WHERE key = ?`,
    args: ["schema_version"],
  })
  return String(res.rows[0]?.value ?? "0")
}

async function writeVersion(version: string) {
  await client().execute({
    sql: `INSERT INTO settings (key, value) VALUES ('schema_version', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [version],
  })
}

const REBUILDS: { table: string; columns: string[]; ddl: string; indexes: string[] }[] = [
  {
    table: "projects",
    columns: [
      "id","name","client_name","client_company","client_email","client_phone","status","priority",
      "currency","price","base_price","fx_rate","billing_cycle","start_date","next_payment_date",
      "last_payment_date","reminder_days_before","reminder_sent_for","server_provider","server_ip",
      "server_notes","cloudflare_account","last_maintenance_at","backup_info","repo_url","live_url",
      "stack","progress","due_date","completed_at","tags","description","created_at","updated_at",
    ],
    ddl: `CREATE TABLE projects__new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT,
      client_company TEXT,
      client_email TEXT,
      client_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT NOT NULL DEFAULT 'medium',
      currency TEXT NOT NULL DEFAULT 'TRY',
      price INTEGER,
      base_price INTEGER,
      fx_rate TEXT,
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT,
      next_payment_date TEXT,
      last_payment_date TEXT,
      reminder_days_before INTEGER,
      reminder_sent_for TEXT,
      server_provider TEXT,
      server_ip TEXT,
      server_notes TEXT,
      cloudflare_account TEXT,
      last_maintenance_at TEXT,
      backup_info TEXT,
      repo_url TEXT,
      live_url TEXT,
      stack TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      completed_at TEXT,
      tags TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    indexes: [`CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)`],
  },
  {
    table: "tasks",
    columns: [
      "id","project_id","title","description","status","priority","due_date","estimate_minutes",
      "spent_minutes","remind_at","reminder_fired_at","position","completed_at","created_at","updated_at",
    ],
    ddl: `CREATE TABLE tasks__new (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      estimate_minutes INTEGER,
      spent_minutes INTEGER NOT NULL DEFAULT 0,
      remind_at TEXT,
      reminder_fired_at TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_date)`,
      `CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status)`,
    ],
  },
  {
    table: "notes",
    columns: ["id","project_id","title","content","tags","pinned","created_at","updated_at"],
    ddl: `CREATE TABLE notes__new (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    indexes: [`CREATE INDEX IF NOT EXISTS notes_pinned_idx ON notes(pinned)`],
  },
  {
    table: "payments",
    columns: [
      "id","project_id","title","direction","amount","currency","base_amount","fx_rate","status",
      "issue_date","due_date","paid_date","invoice_no","method","notes","recurrence","created_at","updated_at",
    ],
    ddl: `CREATE TABLE payments__new (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'incoming',
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      base_amount INTEGER NOT NULL DEFAULT 0,
      fx_rate TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      issue_date TEXT,
      due_date TEXT NOT NULL,
      paid_date TEXT,
      invoice_no TEXT,
      method TEXT,
      notes TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS payments_due_idx ON payments(due_date)`,
      `CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)`,
    ],
  },
  {
    table: "transactions",
    columns: [
      "id","type","amount","currency","base_amount","fx_rate","category","description","date",
      "project_id","payment_id","method","created_at",
    ],
    ddl: `CREATE TABLE transactions__new (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      base_amount INTEGER NOT NULL DEFAULT 0,
      fx_rate TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      description TEXT,
      date TEXT NOT NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
      method TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS tx_date_idx ON transactions(date)`,
      `CREATE INDEX IF NOT EXISTS tx_type_idx ON transactions(type)`,
    ],
  },
]

async function rebuildWithoutClientReferences() {
  for (const spec of REBUILDS) {
    if (!(await tableExists(spec.table))) continue
    if (!(await columnExists(spec.table, "client_id"))) continue

    const present: string[] = []
    for (const column of spec.columns) {
      if (await columnExists(spec.table, column)) present.push(column)
    }
    const list = present.join(", ")

    await client().execute(`DROP TABLE IF EXISTS ${spec.table}__new`)
    await client().execute(spec.ddl)
    await client().execute(
      `INSERT INTO ${spec.table}__new (${list}) SELECT ${list} FROM ${spec.table}`,
    )
    await client().execute(`DROP TABLE ${spec.table}`)
    await client().execute(`ALTER TABLE ${spec.table}__new RENAME TO ${spec.table}`)
    for (const index of spec.indexes) await client().execute(index)
  }
}

async function migrateToV2() {
  if (!(await tableExists("clients"))) return

  if (await columnExists("projects", "client_id")) {
    await client().execute(`
      UPDATE projects
      SET client_name = COALESCE(
            client_name,
            (SELECT c.name FROM clients c WHERE c.id = projects.client_id)
          ),
          client_company = COALESCE(
            client_company,
            (SELECT c.company FROM clients c WHERE c.id = projects.client_id)
          ),
          client_email = COALESCE(
            client_email,
            (SELECT c.email FROM clients c WHERE c.id = projects.client_id)
          ),
          client_phone = COALESCE(
            client_phone,
            (SELECT c.phone FROM clients c WHERE c.id = projects.client_id)
          )
      WHERE client_id IS NOT NULL
    `)
  }

  await client().execute(`PRAGMA foreign_keys = OFF`)
  await rebuildWithoutClientReferences()
  await client().execute(`DROP TABLE IF EXISTS clients`)
  await client().execute(`PRAGMA foreign_keys = ON`)
}

const POST_DDL = [
  `CREATE INDEX IF NOT EXISTS projects_next_payment_idx ON projects(next_payment_date)`,
  `CREATE INDEX IF NOT EXISTS tasks_remind_idx ON tasks(remind_at)`,
]

async function migrate() {
  for (const stmt of DDL) await client().execute(stmt)
  for (const [table, column, definition] of ADDED_COLUMNS) {
    await ensureColumn(table, column, definition)
  }

  if ((await readVersion()) !== SCHEMA_VERSION) {
    await migrateToV2()
    await client().execute(
      `UPDATE transactions SET base_amount = amount WHERE base_amount = 0 AND currency = 'TRY'`,
    )
    await client().execute(
      `UPDATE payments SET base_amount = amount WHERE base_amount = 0 AND currency = 'TRY'`,
    )
    await writeVersion(SCHEMA_VERSION)
  }

  for (const stmt of POST_DDL) await client().execute(stmt)
}

export function ready() {
  globalForDb.__sourceDbReady ??= migrate().catch((error) => {
    globalForDb.__sourceDbReady = undefined
    throw error
  })
  return globalForDb.__sourceDbReady
}

export { schema }
