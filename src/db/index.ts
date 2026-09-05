import "server-only"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { type Client, createClient } from "@libsql/client"
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

const url = process.env.DATABASE_URL ?? "file:./data/source.db"

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
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    tax_office TEXT,
    tax_number TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    currency TEXT NOT NULL DEFAULT 'TRY',
    hourly_rate INTEGER,
    notes TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status)`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    priority TEXT NOT NULL DEFAULT 'medium',
    billing_type TEXT NOT NULL DEFAULT 'fixed',
    budget INTEGER,
    hourly_rate INTEGER,
    currency TEXT NOT NULL DEFAULT 'TRY',
    progress INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    completed_at TEXT,
    repo_url TEXT,
    live_url TEXT,
    stack TEXT,
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)`,
  `CREATE INDEX IF NOT EXISTS projects_client_idx ON projects(client_id)`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
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
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
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
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'incoming',
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
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
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    date TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
    method TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS tx_date_idx ON transactions(date)`,
  `CREATE INDEX IF NOT EXISTS tx_type_idx ON transactions(type)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
]

const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ["tasks", "remind_at", "TEXT"],
  ["tasks", "reminder_fired_at", "TEXT"],
]

async function ensureColumn(table: string, column: string, definition: string) {
  const res = await client().execute({
    sql: `SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?`,
    args: [table, column],
  })
  if (Number(res.rows[0]?.n ?? 0) === 0) {
    await client().execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

const POST_DDL = [`CREATE INDEX IF NOT EXISTS tasks_remind_idx ON tasks(remind_at)`]

async function migrate() {
  for (const stmt of DDL) await client().execute(stmt)
  for (const [table, column, definition] of ADDED_COLUMNS) await ensureColumn(table, column, definition)
  for (const stmt of POST_DDL) await client().execute(stmt)
}

export function ready() {
  globalForDb.__sourceDbReady ??= migrate()
  return globalForDb.__sourceDbReady
}

export { schema }
