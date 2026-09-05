"use server"

import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { goalContributions, goals, transactions } from "@/db/schema"
import { toMinor, todayISO } from "@/lib/format"
import { convertToBase } from "@/lib/fx"
import { type ActionState, newId, nowISO, reqStr, run, str } from "./helpers"

const PATHS = ["/", "/hedefler", "/finans"]
const touch = () => {
  for (const path of PATHS) revalidatePath(path)
}

export async function saveGoal(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const currency = str(fd, "currency") ?? "TRY"
    const targetInput = str(fd, "targetAmount")
    const targetAmount = targetInput ? toMinor(targetInput) : null
    const converted = targetAmount ? await convertToBase(targetAmount, currency) : null
    const status = str(fd, "status") ?? "open"

    const existing = id ? (await db.select().from(goals).where(eq(goals.id, id)))[0] : undefined

    const data = {
      title: reqStr(fd, "title", "Başlık"),
      type: str(fd, "type") ?? "other",
      url: str(fd, "url"),
      notes: str(fd, "notes"),
      status,
      priority: str(fd, "priority") ?? "medium",
      targetAmount,
      currency,
      baseTargetAmount: converted?.baseAmount ?? null,
      fxRate: converted?.fxRate ?? null,
      targetDate: str(fd, "targetDate"),
      completedAt: status === "done" ? (existing?.completedAt ?? nowISO()) : null,
      updatedAt: nowISO(),
    }

    if (id) await db.update(goals).set(data).where(eq(goals.id, id))
    else await db.insert(goals).values({ id: newId(), ...data, createdAt: nowISO() })

    touch()
    return { ok: true }
  })
}

export async function deleteGoal(id: string) {
  await ready()
  await db.delete(goals).where(eq(goals.id, id))
  touch()
}

export async function setGoalStatus(id: string, status: string) {
  await ready()
  await db
    .update(goals)
    .set({ status, completedAt: status === "done" ? nowISO() : null, updatedAt: nowISO() })
    .where(eq(goals.id, id))
  touch()
}

export async function addContribution(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const goalId = reqStr(fd, "goalId", "Hedef")
    const currency = str(fd, "currency") ?? "TRY"
    const amount = toMinor(str(fd, "amount"))
    if (amount <= 0) return { error: "Tutar sıfırdan büyük olmalı." }
    const date = str(fd, "date") ?? todayISO()
    const converted = await convertToBase(amount, currency, date)

    await db.insert(goalContributions).values({
      id: newId(),
      goalId,
      amount,
      currency,
      baseAmount: converted.baseAmount,
      fxRate: converted.fxRate,
      date,
      source: "manual",
      note: str(fd, "note"),
      createdAt: nowISO(),
    })

    touch()
    return { ok: true }
  })
}

export async function deleteContribution(id: string) {
  await ready()
  await db.delete(goalContributions).where(eq(goalContributions.id, id))
  touch()
}

export async function withdrawAll(goalId: string) {
  await ready()
  await db.delete(goalContributions).where(eq(goalContributions.goalId, goalId))
  touch()
}

export async function purchaseGoal(goalId: string) {
  await ready()
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId))
  if (!goal) return

  const [saved] = await db
    .select({ total: sql<number>`coalesce(sum(${goalContributions.baseAmount}), 0)` })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId))

  const spendBase = goal.baseTargetAmount ?? Number(saved?.total ?? 0)
  if (spendBase > 0) {
    await db.insert(transactions).values({
      id: newId(),
      type: "expense",
      amount: goal.targetAmount ?? spendBase,
      currency: goal.currency,
      baseAmount: spendBase,
      fxRate: goal.fxRate,
      category: goal.type === "subscription" ? "software" : "other_expense",
      description: goal.title,
      date: todayISO(),
      createdAt: nowISO(),
    })
  }

  await db.delete(goalContributions).where(eq(goalContributions.goalId, goalId))
  await db
    .update(goals)
    .set({ status: "done", completedAt: nowISO(), updatedAt: nowISO() })
    .where(eq(goals.id, goalId))

  touch()
  revalidatePath("/odemeler")
}

export async function releaseFromTransaction(transactionId: string) {
  await ready()
  await db.delete(goalContributions).where(and(eq(goalContributions.transactionId, transactionId)))
  touch()
}
