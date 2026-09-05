"use server"

import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { notes, payments, projectDomains, projectItems, projects, tasks, transactions } from "@/db/schema"
import { nowISO } from "./helpers"

const PATHS = ["/", "/gorevler", "/notlar", "/projeler", "/odemeler", "/finans", "/ayarlar"]
const touchAll = () => {
  for (const path of PATHS) revalidatePath(path)
}

export async function clearAllData() {
  await ready()
  await db.delete(transactions)
  await db.delete(payments)
  await db.delete(tasks)
  await db.delete(notes)
  await db.delete(projectItems)
  await db.delete(projectDomains)
  await db.delete(projects)
  touchAll()
}

export async function exportData() {
  await ready()
  const [p, d, i, t, n, pm, tx] = await Promise.all([
    db.select().from(projects),
    db.select().from(projectDomains),
    db.select().from(projectItems),
    db.select().from(tasks),
    db.select().from(notes),
    db.select().from(payments),
    db.select().from(transactions),
  ])
  return JSON.stringify(
    {
      version: 2,
      exportedAt: nowISO(),
      projects: p,
      projectDomains: d,
      projectItems: i,
      tasks: t,
      notes: n,
      payments: pm,
      transactions: tx,
    },
    null,
    2,
  )
}

type Backup = {
  version?: number
  projects?: unknown[]
  projectDomains?: unknown[]
  projectItems?: unknown[]
  tasks?: unknown[]
  notes?: unknown[]
  payments?: unknown[]
  transactions?: unknown[]
}

export async function importData(json: string) {
  await ready()

  let parsed: Backup
  try {
    parsed = JSON.parse(json) as Backup
  } catch {
    return { error: "Dosya geçerli bir JSON değil." }
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.projects)) {
    return { error: "Bu dosya bir Source yedeği gibi görünmüyor." }
  }
  if (parsed.version !== 2) {
    return { error: `Desteklenmeyen yedek sürümü (${parsed.version ?? "bilinmiyor"}). Sürüm 2 bekleniyor.` }
  }

  const counts = {
    projects: parsed.projects.length,
    domains: parsed.projectDomains?.length ?? 0,
    items: parsed.projectItems?.length ?? 0,
    tasks: parsed.tasks?.length ?? 0,
    notes: parsed.notes?.length ?? 0,
    payments: parsed.payments?.length ?? 0,
    transactions: parsed.transactions?.length ?? 0,
  }

  try {
    await clearAllData()
    const insert = async (table: Parameters<typeof db.insert>[0], rows: unknown[] | undefined) => {
      if (!rows?.length) return
      for (let i = 0; i < rows.length; i += 100) {
        await db.insert(table).values(rows.slice(i, i + 100) as never)
      }
    }
    await insert(projects, parsed.projects)
    await insert(projectDomains, parsed.projectDomains)
    await insert(projectItems, parsed.projectItems)
    await insert(tasks, parsed.tasks)
    await insert(notes, parsed.notes)
    await insert(payments, parsed.payments)
    await insert(transactions, parsed.transactions)
  } catch (error) {
    console.error(error)
    return { error: "İçe aktarma sırasında hata oluştu. Veriler kısmen yüklenmiş olabilir." }
  }

  touchAll()
  return { ok: true, counts }
}
