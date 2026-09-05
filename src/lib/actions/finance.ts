"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { requireSession } from "@/lib/auth/guard"
import { audit } from "@/lib/observability"
import { goalContributions, payments, transactions } from "@/db/schema"
import { addMonths, toMinor, todayISO } from "@/lib/format"
import { convertToBase } from "@/lib/fx"
import { type ActionState, newId, nowISO, reqStr, ref, run, str } from "./helpers"

const TOUCH = ["/", "/finans", "/odemeler", "/projeler", "/hedefler"]
const touch = () => TOUCH.forEach((p) => revalidatePath(p))

export async function saveTransaction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const amount = toMinor(str(fd, "amount"))
    if (amount <= 0) return { error: "Tutar sıfırdan büyük olmalı." }
    const currency = str(fd, "currency") ?? "TRY"
    const date = str(fd, "date") ?? todayISO()
    const converted = await convertToBase(amount, currency, date)
    const data = {
      type: str(fd, "type") ?? "income",
      amount,
      currency,
      baseAmount: converted.baseAmount,
      fxRate: converted.fxRate,
      category: str(fd, "category") ?? "other",
      description: str(fd, "description"),
      date,
      projectId: ref(fd, "projectId"),
      method: str(fd, "method"),
    }
    let txId = id
    if (id) {
      await db.update(transactions).set(data).where(eq(transactions.id, id))
    } else {
      txId = newId()
      await db.insert(transactions).values({ id: txId, ...data, createdAt: nowISO() })
    }

    if (txId) await applyGoalAllocation(txId, fd, data.type, amount, currency, converted, date)

    touch()
    return { ok: true }
  })
}

async function applyGoalAllocation(
  txId: string,
  fd: FormData,
  type: string,
  amount: number,
  currency: string,
  converted: { baseAmount: number; fxRate: string },
  date: string,
) {
  await db.delete(goalContributions).where(eq(goalContributions.transactionId, txId))

  const goalId = ref(fd, "goalId")
  if (!goalId || type !== "income") return

  const mode = str(fd, "allocationMode") ?? "percent"
  const rawValue = str(fd, "allocationValue")
  if (!rawValue) return

  let allocated: number
  if (mode === "percent") {
    const percent = Math.min(100, Math.max(0, Number.parseFloat(rawValue.replace(",", ".")) || 0))
    if (percent <= 0) return
    allocated = Math.round((amount * percent) / 100)
  } else {
    allocated = Math.min(amount, toMinor(rawValue))
  }
  if (allocated <= 0) return

  const allocatedBase = Math.round((converted.baseAmount * allocated) / amount)

  await db.insert(goalContributions).values({
    id: newId(),
    goalId,
    amount: allocated,
    currency,
    baseAmount: allocatedBase,
    fxRate: converted.fxRate,
    date,
    source: "income_allocation",
    transactionId: txId,
    note: str(fd, "description"),
    createdAt: nowISO(),
  })
}

export async function deleteTransaction(id: string) {
  await requireSession()
  await db.delete(transactions).where(eq(transactions.id, id))
  await audit("delete", "transaction", { entityId: id })
  touch()
}

export async function savePayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const amount = toMinor(str(fd, "amount"))
    if (amount <= 0) return { error: "Tutar sıfırdan büyük olmalı." }
    const status = str(fd, "status") ?? "pending"
    const currency = str(fd, "currency") ?? "TRY"
    const dueDate = str(fd, "dueDate") ?? todayISO()
    const converted = await convertToBase(amount, currency, dueDate)
    const data = {
      projectId: ref(fd, "projectId"),
      title: reqStr(fd, "title", "Başlık"),
      direction: str(fd, "direction") ?? "incoming",
      amount,
      currency,
      baseAmount: converted.baseAmount,
      fxRate: converted.fxRate,
      status,
      issueDate: str(fd, "issueDate"),
      dueDate,
      paidDate: status === "paid" ? (str(fd, "paidDate") ?? todayISO()) : null,
      invoiceNo: str(fd, "invoiceNo"),
      method: str(fd, "method"),
      notes: str(fd, "notes"),
      recurrence: str(fd, "recurrence") ?? "none",
      updatedAt: nowISO(),
    }
    if (id) await db.update(payments).set(data).where(eq(payments.id, id))
    else await db.insert(payments).values({ id: newId(), ...data, createdAt: nowISO() })
    touch()
    return { ok: true }
  })
}

export async function deletePayment(id: string) {
  await requireSession()
  await db.delete(payments).where(eq(payments.id, id))
  await audit("delete", "payment", { entityId: id })
  touch()
}

export async function markPaymentPaid(id: string, paidDate?: string) {
  await requireSession()
  const [row] = await db.select().from(payments).where(eq(payments.id, id))
  if (!row || row.status === "paid") return
  const date = paidDate ?? todayISO()

  await db.update(payments).set({ status: "paid", paidDate: date, updatedAt: nowISO() }).where(eq(payments.id, id))

  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.paymentId, id)))
  if (existing.length === 0) {
    await db.insert(transactions).values({
      id: newId(),
      type: row.direction === "incoming" ? "income" : "expense",
      amount: row.amount,
      currency: row.currency,
      baseAmount: row.baseAmount,
      fxRate: row.fxRate,
      category: row.direction === "incoming" ? "project" : "other_expense",
      description: row.title,
      date,
      projectId: row.projectId,
      paymentId: row.id,
      method: row.method,
      createdAt: nowISO(),
    })
  }

  if (row.recurrence !== "none") {
    const step = row.recurrence === "monthly" ? 1 : row.recurrence === "quarterly" ? 3 : 12
    await db.insert(payments).values({
      id: newId(),
      projectId: row.projectId,
      title: row.title,
      direction: row.direction,
      amount: row.amount,
      currency: row.currency,
      baseAmount: row.baseAmount,
      fxRate: row.fxRate,
      status: "pending",
      dueDate: addMonths(row.dueDate, step),
      invoiceNo: null,
      method: row.method,
      notes: row.notes,
      recurrence: row.recurrence,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
  }
  touch()
}

export async function unmarkPayment(id: string) {
  await requireSession()
  await db.update(payments).set({ status: "pending", paidDate: null, updatedAt: nowISO() }).where(eq(payments.id, id))
  await db.delete(transactions).where(eq(transactions.paymentId, id))
  touch()
}
