import { createHash, timingSafeEqual } from "node:crypto"
import { and, eq, isNotNull, ne } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, ready } from "@/db"
import { payments, projectDomains, projects, tasks } from "@/db/schema"

export const dynamic = "force-dynamic"

function escape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

function stamp(date: string) {
  return date.slice(0, 10).replace(/-/g, "")
}

function event(uid: string, date: string, summary: string, description: string) {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0]
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@source`,
    `DTSTAMP:${now}Z`,
    `DTSTART;VALUE=DATE:${stamp(date)}`,
    `SUMMARY:${escape(summary)}`,
    description ? `DESCRIPTION:${escape(description)}` : "",
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n")
}

function calendarToken() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET yok")
  return createHash("sha256").update(`calendar:${secret}`).digest("hex").slice(0, 40)
}

export async function GET(request: Request) {
  const provided = new URL(request.url).searchParams.get("t") ?? ""
  const expected = calendarToken()
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("unauthorized", { status: 401 })
  }

  await ready()
  const [taskRows, paymentRows, projectRows, domainRows] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .where(and(isNotNull(tasks.dueDate), ne(tasks.status, "done"))),
    db
      .select({ id: payments.id, title: payments.title, dueDate: payments.dueDate })
      .from(payments)
      .where(eq(payments.status, "pending")),
    db.select().from(projects).where(ne(projects.status, "cancelled")),
    db.select().from(projectDomains).where(isNotNull(projectDomains.expiresAt)),
  ])

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Source//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Source",
    "X-WR-TIMEZONE:Europe/Istanbul",
  ]

  for (const t of taskRows) {
    if (t.dueDate) lines.push(event(`task-${t.id}`, t.dueDate, t.title, "Source gorevi"))
  }
  for (const p of paymentRows) {
    lines.push(event(`payment-${p.id}`, p.dueDate, `Odeme: ${p.title}`, "Odeme vadesi"))
  }
  for (const p of projectRows) {
    if (p.dueDate) {
      lines.push(event(`due-${p.id}`, p.dueDate, `Teslim: ${p.name}`, p.clientName ?? ""))
    }
    if (p.nextPaymentDate && p.status === "active") {
      lines.push(event(`cycle-${p.id}`, p.nextPaymentDate, `Tahsilat: ${p.name}`, p.clientName ?? ""))
    }
  }
  for (const d of domainRows) {
    if (d.expiresAt) {
      lines.push(event(`domain-${d.id}`, d.expiresAt, `Domain bitis: ${d.host}`, "Alan adi yenileme"))
    }
  }

  lines.push("END:VCALENDAR")

  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "no-store",
      "content-disposition": 'inline; filename="source.ics"',
    },
  })
}
