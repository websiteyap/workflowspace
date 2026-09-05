"use server"

import { and, asc, eq, gte, isNotNull, isNull, lte, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { projects, tasks } from "@/db/schema"
import { localInputToISO } from "@/lib/format"
import { type ActionState, int, newId, nowISO, ref, reqStr, run, str } from "./helpers"

const TOUCH = ["/", "/gorevler", "/projeler"]
const touch = () => TOUCH.forEach((p) => revalidatePath(p))

export async function saveTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const status = str(fd, "status") ?? "todo"
    const data = {
      projectId: ref(fd, "projectId"),
      title: reqStr(fd, "title", "Görev başlığı"),
      description: str(fd, "description"),
      status,
      priority: str(fd, "priority") ?? "medium",
      dueDate: str(fd, "dueDate"),
      estimateMinutes: int(fd, "estimateMinutes"),
      remindAt: localInputToISO(str(fd, "remindAt")),
      completedAt: status === "done" ? nowISO() : null,
      updatedAt: nowISO(),
    }
    if (id) {
      const [current] = await db.select({ remindAt: tasks.remindAt }).from(tasks).where(eq(tasks.id, id))
      
      const resetFired = current?.remindAt !== data.remindAt ? { reminderFiredAt: null } : {}
      await db.update(tasks).set({ ...data, ...resetFired }).where(eq(tasks.id, id))
    } else {
      await db.insert(tasks).values({ id: newId(), ...data, createdAt: nowISO() })
    }
    touch()
    return { ok: true }
  })
}

export async function quickTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const title = reqStr(fd, "title", "Görev başlığı")
    await db.insert(tasks).values({
      id: newId(),
      title,
      dueDate: str(fd, "dueDate"),
      projectId: ref(fd, "projectId"),
      priority: str(fd, "priority") ?? "medium",
      status: "todo",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })
    touch()
    return { ok: true }
  })
}

export async function toggleTask(id: string, done: boolean) {
  await ready()
  await db
    .update(tasks)
    .set({ status: done ? "done" : "todo", completedAt: done ? nowISO() : null, updatedAt: nowISO() })
    .where(eq(tasks.id, id))
  touch()
}

export async function moveTaskDate(id: string, dueDate: string | null) {
  await ready()
  await db.update(tasks).set({ dueDate, updatedAt: nowISO() }).where(eq(tasks.id, id))
  touch()
}

export async function deleteTask(id: string) {
  await ready()
  await db.delete(tasks).where(eq(tasks.id, id))
  touch()
}

export async function markReminderFired(id: string) {
  await ready()
  await db.update(tasks).set({ reminderFiredAt: nowISO() }).where(eq(tasks.id, id))
  touch()
}

export async function snoozeReminder(id: string, minutes: number) {
  await ready()
  const remindAt = new Date(Date.now() + minutes * 60_000).toISOString()
  await db.update(tasks).set({ remindAt, reminderFiredAt: null, updatedAt: nowISO() }).where(eq(tasks.id, id))
  touch()
}

export async function clearReminder(id: string) {
  await ready()
  await db.update(tasks).set({ remindAt: null, reminderFiredAt: null, updatedAt: nowISO() }).where(eq(tasks.id, id))
  touch()
}

export type DueReminder = {
  id: string
  title: string
  remindAt: string
  projectName: string | null
}

export async function fetchDueReminders(horizonMs = 75_000): Promise<DueReminder[]> {
  await ready()
  const now = Date.now()
  const until = new Date(now + horizonMs).toISOString()
  const since = new Date(now - 24 * 60 * 60_000).toISOString()

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      remindAt: tasks.remindAt,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        isNotNull(tasks.remindAt),
        isNull(tasks.reminderFiredAt),
        ne(tasks.status, "done"),
        lte(tasks.remindAt, until),
        gte(tasks.remindAt, since),
      ),
    )
    .orderBy(asc(tasks.remindAt))
    .limit(20)

  return rows.map((r) => ({ ...r, remindAt: r.remindAt as string }))
}
