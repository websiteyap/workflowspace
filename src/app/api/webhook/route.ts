import { randomUUID, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { db, ready } from "@/db"
import { tasks, transactions } from "@/db/schema"
import { getSetting } from "@/lib/auth/store"
import { toMinor, todayISO } from "@/lib/format"
import { convertToBase } from "@/lib/fx"
import { notify } from "@/lib/notify"
import { audit, captureError } from "@/lib/observability"

export const dynamic = "force-dynamic"

type Payload = {
  type?: string
  title?: string
  body?: string
  dueDate?: string
  priority?: string
  amount?: string | number
  currency?: string
  description?: string
  category?: string
  date?: string
  url?: string
}

async function authorize(request: Request) {
  const provided = new URL(request.url).searchParams.get("t") ?? ""
  const expected = await getSetting("webhook_token")
  if (!expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  await ready()

  if (!(await authorize(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let payload: Payload
  try {
    payload = (await request.json()) as Payload
  } catch {
    return NextResponse.json({ error: "gecersiz JSON" }, { status: 400 })
  }

  const now = new Date().toISOString()

  try {
    switch (payload.type) {
      case "task": {
        const title = payload.title?.trim()
        if (!title) return NextResponse.json({ error: "title gerekli" }, { status: 400 })

        const id = randomUUID()
        await db.insert(tasks).values({
          id,
          title: title.slice(0, 200),
          description: payload.body?.slice(0, 2000) ?? null,
          status: "todo",
          priority: ["low", "medium", "high", "urgent"].includes(payload.priority ?? "")
            ? (payload.priority as string)
            : "medium",
          dueDate: payload.dueDate?.slice(0, 10) ?? todayISO(),
          position: 0,
          createdAt: now,
          updatedAt: now,
        })
        await audit("create", "task", { entityId: id, summary: `webhook: ${title.slice(0, 60)}` })
        return NextResponse.json({ ok: true, id })
      }

      case "income":
      case "expense": {
        const amount = toMinor(String(payload.amount ?? ""))
        if (amount <= 0) return NextResponse.json({ error: "amount gecersiz" }, { status: 400 })

        const currency = (payload.currency ?? "TRY").toUpperCase()
        const date = payload.date?.slice(0, 10) ?? todayISO()
        const converted = await convertToBase(amount, currency, date)
        const id = randomUUID()

        await db.insert(transactions).values({
          id,
          type: payload.type,
          amount,
          currency,
          baseAmount: converted.baseAmount,
          fxRate: converted.fxRate,
          category: payload.category ?? (payload.type === "income" ? "other_income" : "other_expense"),
          description: payload.description?.slice(0, 200) ?? null,
          date,
          createdAt: now,
        })
        await audit("create", "transaction", { entityId: id, summary: "webhook" })
        return NextResponse.json({ ok: true, id })
      }

      case "notify": {
        const title = payload.title?.trim()
        if (!title) return NextResponse.json({ error: "title gerekli" }, { status: 400 })
        const result = await notify({
          title: title.slice(0, 120),
          body: payload.body?.slice(0, 400),
          url: payload.url?.startsWith("/") ? payload.url : "/",
        })
        return NextResponse.json({ ok: true, ...result })
      }

      default:
        return NextResponse.json(
          { error: "type gecersiz", accepted: ["task", "income", "expense", "notify"] },
          { status: 400 },
        )
    }
  } catch (error) {
    await captureError(error, "webhook")
    return NextResponse.json({ error: "islem basarisiz" }, { status: 500 })
  }
}
