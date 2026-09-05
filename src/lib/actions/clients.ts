"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { clients } from "@/db/schema"
import { toMinor } from "@/lib/format"
import { type ActionState, newId, nowISO, reqStr, run, str } from "./helpers"

function payload(fd: FormData) {
  return {
    name: reqStr(fd, "name", "Müşteri adı"),
    company: str(fd, "company"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    website: str(fd, "website"),
    address: str(fd, "address"),
    taxOffice: str(fd, "taxOffice"),
    taxNumber: str(fd, "taxNumber"),
    status: str(fd, "status") ?? "active",
    currency: str(fd, "currency") ?? "TRY",
    hourlyRate: str(fd, "hourlyRate") ? toMinor(str(fd, "hourlyRate")) : null,
    notes: str(fd, "notes"),
    updatedAt: nowISO(),
  }
}

export async function saveClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id")
    const data = payload(fd)
    if (id) {
      await db.update(clients).set(data).where(eq(clients.id, id))
      revalidatePath(`/musteriler/${id}`)
    } else {
      const newid = newId()
      await db.insert(clients).values({ id: newid, ...data, createdAt: nowISO() })
      revalidatePath("/musteriler")
      revalidatePath("/")
      return { ok: true, id: newid }
    }
    revalidatePath("/musteriler")
    revalidatePath("/")
    return { ok: true, id }
  })
}

export async function deleteClientById(id: string) {
  await ready()
  await db.delete(clients).where(eq(clients.id, id))
  revalidatePath("/musteriler")
  revalidatePath("/")
}

