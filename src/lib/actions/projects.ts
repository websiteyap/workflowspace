"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { requireSession } from "@/lib/auth/guard"
import { projectDomains, projectItems, projects } from "@/db/schema"
import { CYCLE_MONTHS } from "@/lib/constants"
import { addMonths, toMinor, todayISO } from "@/lib/format"
import { convertToBase } from "@/lib/fx"
import { type ActionState, bool, int, newId, nowISO, reqStr, run, str } from "./helpers"

const PATHS = ["/", "/projeler", "/odemeler", "/finans", "/gorevler"]
const touch = (id?: string | null) => {
  for (const path of PATHS) revalidatePath(path)
  if (id) revalidatePath(`/projeler/${id}`)
}

export async function computeNextPayment(startDate: string | null, cycle: string, from?: string) {
  const months = CYCLE_MONTHS[cycle] ?? 0
  if (!startDate || months === 0) return null
  const anchor = from ?? todayISO()
  let next = startDate.slice(0, 10)
  let guard = 0
  while (next < anchor && guard < 600) {
    next = addMonths(next, months)
    guard += 1
  }
  return next
}

export async function saveProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const status = str(fd, "status") ?? "active"
    const currency = str(fd, "currency") ?? "TRY"
    const cycle = str(fd, "billingCycle") ?? "monthly"
    const startDate = str(fd, "startDate")
    const priceInput = str(fd, "price")
    const price = priceInput ? toMinor(priceInput) : null

    const converted = price ? await convertToBase(price, currency, startDate ?? undefined) : null
    const reminder = int(fd, "reminderDaysBefore")

    const existing = id ? (await db.select().from(projects).where(eq(projects.id, id)))[0] : undefined
    const keepNext =
      existing && existing.billingCycle === cycle && existing.startDate === startDate
        ? existing.nextPaymentDate
        : null

    const data = {
      name: reqStr(fd, "name", "Proje adı"),
      clientName: str(fd, "clientName"),
      clientCompany: str(fd, "clientCompany"),
      clientEmail: str(fd, "clientEmail"),
      clientPhone: str(fd, "clientPhone"),
      status,
      priority: str(fd, "priority") ?? "medium",
      currency,
      price,
      basePrice: converted?.baseAmount ?? null,
      fxRate: converted?.fxRate ?? null,
      billingCycle: cycle,
      startDate,
      nextPaymentDate: keepNext ?? (await computeNextPayment(startDate, cycle)),
      reminderDaysBefore: reminder && reminder > 0 ? reminder : null,
      serverProvider: str(fd, "serverProvider"),
      serverIp: str(fd, "serverIp"),
      serverNotes: str(fd, "serverNotes"),
      cloudflareAccount: str(fd, "cloudflareAccount"),
      lastMaintenanceAt: str(fd, "lastMaintenanceAt"),
      backupInfo: str(fd, "backupInfo"),
      repoUrl: str(fd, "repoUrl"),
      liveUrl: str(fd, "liveUrl"),
      stack: str(fd, "stack"),
      progress: Math.min(100, Math.max(0, int(fd, "progress") ?? 0)),
      dueDate: str(fd, "dueDate"),
      completedAt: status === "completed" ? (existing?.completedAt ?? nowISO()) : null,
      tags: str(fd, "tags"),
      description: str(fd, "description"),
      updatedAt: nowISO(),
    }

    let resultId = id
    if (id) {
      await db.update(projects).set(data).where(eq(projects.id, id))
    } else {
      resultId = newId()
      await db.insert(projects).values({ id: resultId, ...data, createdAt: nowISO() })
    }
    touch(resultId)
    return { ok: true, id: resultId ?? undefined }
  })
}

export async function deleteProjectById(id: string) {
  await requireSession()
  await db.delete(projects).where(eq(projects.id, id))
  touch()
}

export async function updateProjectStatus(id: string, status: string) {
  await requireSession()
  await db
    .update(projects)
    .set({
      status,
      completedAt: status === "completed" ? nowISO() : null,
      progress: status === "completed" ? 100 : undefined,
      updatedAt: nowISO(),
    })
    .where(eq(projects.id, id))
  touch(id)
}

export async function markMaintenanceDone(id: string) {
  await requireSession()
  await db.update(projects).set({ lastMaintenanceAt: todayISO(), updatedAt: nowISO() }).where(eq(projects.id, id))
  touch(id)
}

export async function advancePayment(id: string) {
  await requireSession()
  const [project] = await db.select().from(projects).where(eq(projects.id, id))
  if (!project) return
  const months = CYCLE_MONTHS[project.billingCycle] ?? 0
  const current = project.nextPaymentDate ?? todayISO()
  const next = months > 0 ? addMonths(current, months) : null
  await db
    .update(projects)
    .set({
      lastPaymentDate: current,
      nextPaymentDate: next,
      reminderSentFor: null,
      updatedAt: nowISO(),
    })
    .where(eq(projects.id, id))
  touch(id)
}

export async function saveProjectItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const projectId = reqStr(fd, "projectId", "Proje")
    const currency = str(fd, "currency") ?? "TRY"
    const amount = toMinor(str(fd, "amount"))
    if (amount <= 0) return { error: "Tutar sıfırdan büyük olmalı." }
    const date = str(fd, "date")
    const converted = await convertToBase(amount, currency, date ?? undefined)

    const data = {
      projectId,
      title: reqStr(fd, "title", "Kalem adı"),
      kind: str(fd, "kind") ?? "cost",
      amount,
      currency,
      baseAmount: converted.baseAmount,
      fxRate: converted.fxRate,
      recurring: bool(fd, "recurring"),
      date,
      notes: str(fd, "notes"),
    }

    if (id) await db.update(projectItems).set(data).where(eq(projectItems.id, id))
    else await db.insert(projectItems).values({ id: newId(), ...data, createdAt: nowISO() })

    touch(projectId)
    return { ok: true }
  })
}

export async function deleteProjectItem(id: string, projectId: string) {
  await requireSession()
  await db.delete(projectItems).where(and(eq(projectItems.id, id), eq(projectItems.projectId, projectId)))
  touch(projectId)
}

export async function saveDomain(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const projectId = reqStr(fd, "projectId", "Proje")
    const data = {
      projectId,
      host: reqStr(fd, "host", "Alan adı")
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, ""),
      registrar: str(fd, "registrar"),
      expiresAt: str(fd, "expiresAt"),
      isPrimary: bool(fd, "isPrimary"),
      notes: str(fd, "notes"),
    }

    if (data.isPrimary === 1) {
      await db.update(projectDomains).set({ isPrimary: 0 }).where(eq(projectDomains.projectId, projectId))
    }

    if (id) await db.update(projectDomains).set(data).where(eq(projectDomains.id, id))
    else await db.insert(projectDomains).values({ id: newId(), ...data, createdAt: nowISO() })

    touch(projectId)
    return { ok: true }
  })
}

export async function deleteDomain(id: string, projectId: string) {
  await requireSession()
  await db.delete(projectDomains).where(and(eq(projectDomains.id, id), eq(projectDomains.projectId, projectId)))
  touch(projectId)
}
