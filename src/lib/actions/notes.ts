"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { notes } from "@/db/schema"
import { type ActionState, bool, newId, nowISO, reqStr, ref, run, str } from "./helpers"

export async function saveNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const data = {
      title: reqStr(fd, "title", "Not başlığı"),
      content: str(fd, "content") ?? "",
      tags: str(fd, "tags"),
      projectId: ref(fd, "projectId"),
      clientId: ref(fd, "clientId"),
      pinned: bool(fd, "pinned"),
      updatedAt: nowISO(),
    }
    let resultId = id
    if (id) {
      await db.update(notes).set(data).where(eq(notes.id, id))
    } else {
      resultId = newId()
      await db.insert(notes).values({ id: resultId, ...data, createdAt: nowISO() })
    }
    revalidatePath("/notlar")
    revalidatePath("/")
    return { ok: true, id: resultId ?? undefined }
  })
}

export async function deleteNote(id: string) {
  await ready()
  await db.delete(notes).where(eq(notes.id, id))
  revalidatePath("/notlar")
  revalidatePath("/")
}

export async function togglePin(id: string, pinned: boolean) {
  await ready()
  await db.update(notes).set({ pinned: pinned ? 1 : 0, updatedAt: nowISO() }).where(eq(notes.id, id))
  revalidatePath("/notlar")
}
