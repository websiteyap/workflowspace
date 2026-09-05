"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { payments, transactions } from "@/db/schema"
import { addMonths, toMinor, todayISO } from "@/lib/format"
import { type ActionState, newId, nowISO, reqStr, ref, run, str } from "./helpers"

const TOUCH = ["/", "/finans", "/odemeler", "/projeler"]
const touch = () => TOUCH.forEach((p) => revalidatePath(p))

export async function saveTransaction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const amount = toMinor(str(fd, "amount"))
    if (amount <= 0) return { error: "Tutar sıfırdan büyük olmalı." }
    const data = {
      type: str(fd, "type") ?? "income",
      amount,
      currency: str(fd, "currency") ?? "TRY",
      category: str(fd, "category") ?? "other",
      description: str(fd, "description"),
      date: str(fd, "date") ?? todayISO(),
      clientId: ref(fd, "clientId"),
      projectId: ref(fd, "projectId"),
      method: str(fd, "method"),
    }
    if (id) await db.update(transactions).set(data).where(eq(transactions.id, id))
    else await db.insert(transactions).values({ id: newId(), ...data, createdAt: nowISO() })
    touch()
    return { ok: true }
  })
}

export async function deleteTransaction(id: string) {
  await ready()
  await db.delete(transactions).where(eq(transactions.id, id))
  touch()
}

export async function savePayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const amount = toMinor(str(fd, "amount"))
    if (amount <= 0) return { error: "Tutar sıfırdan büyük olmalı." }
    const status = str(fd, "status") ?? "pending"
    const data = {
      clientId: ref(fd, "clientId"),
      projectId: ref(fd, "projectId"),
      title: reqStr(fd, "title", "Başlık"),
      direction: str(fd, "direction") ?? "incoming",
      amount,
      currency: str(fd, "currency") ?? "TRY",
      status,
      issueDate: str(fd, "issueDate"),
      dueDate: str(fd, "dueDate") ?? todayISO(),
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
  await ready()
  await db.delete(payments).where(eq(payments.id, id))
  touch()
}

export async function markPaymentPaid(id: string, paidDate?: string) {
  await ready()
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
      category: row.direction === "incoming" ? "project" : "other_expense",
      description: row.title,
      date,
      clientId: row.clientId,
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
      clientId: row.clientId,
      projectId: row.projectId,
      title: row.title,
      direction: row.direction,
      amount: row.amount,
      currency: row.currency,
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
  await ready()
  await db.update(payments).set({ status: "pending", paidDate: null, updatedAt: nowISO() }).where(eq(payments.id, id))
  await db.delete(transactions).where(eq(transactions.paymentId, id))
  touch()
}
