"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { projects } from "@/db/schema"
import { toMinor } from "@/lib/format"
import { type ActionState, int, newId, nowISO, reqStr, ref, run, str } from "./helpers"

export async function saveProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const status = str(fd, "status") ?? "active"
    const data = {
      clientId: ref(fd, "clientId"),
      name: reqStr(fd, "name", "Proje adı"),
      description: str(fd, "description"),
      status,
      priority: str(fd, "priority") ?? "medium",
      billingType: str(fd, "billingType") ?? "fixed",
      budget: str(fd, "budget") ? toMinor(str(fd, "budget")) : null,
      hourlyRate: str(fd, "hourlyRate") ? toMinor(str(fd, "hourlyRate")) : null,
      currency: str(fd, "currency") ?? "TRY",
      progress: Math.min(100, Math.max(0, int(fd, "progress") ?? 0)),
      startDate: str(fd, "startDate"),
      dueDate: str(fd, "dueDate"),
      completedAt: status === "completed" ? (str(fd, "completedAt") ?? nowISO()) : null,
      repoUrl: str(fd, "repoUrl"),
      liveUrl: str(fd, "liveUrl"),
      stack: str(fd, "stack"),
      tags: str(fd, "tags"),
      updatedAt: nowISO(),
    }
    let resultId = id
    if (id) {
      await db.update(projects).set(data).where(eq(projects.id, id))
    } else {
      resultId = newId()
      await db.insert(projects).values({ id: resultId, ...data, createdAt: nowISO() })
    }
    revalidatePath("/projeler")
    revalidatePath("/")
    if (resultId) revalidatePath(`/projeler/${resultId}`)
    return { ok: true, id: resultId ?? undefined }
  })
}

export async function deleteProjectById(id: string) {
  await ready()
  await db.delete(projects).where(eq(projects.id, id))
  revalidatePath("/projeler")
  revalidatePath("/")
}

export async function updateProjectStatus(id: string, status: string) {
  await ready()
  await db
    .update(projects)
    .set({ status, completedAt: status === "completed" ? nowISO() : null, progress: status === "completed" ? 100 : undefined, updatedAt: nowISO() })
    .where(eq(projects.id, id))
  revalidatePath("/projeler")
  revalidatePath(`/projeler/${id}`)
  revalidatePath("/")
}

