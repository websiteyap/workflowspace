import "server-only"
import { randomUUID } from "node:crypto"
import { requireSession } from "@/lib/auth/guard"

export type ActionState = { ok?: boolean; error?: string; id?: string; stage?: string } | null

export const newId = () => randomUUID()

export const nowISO = () => new Date().toISOString()

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t === "" ? null : t
}

export function reqStr(fd: FormData, key: string, name: string): string {
  const v = str(fd, key)
  if (!v) throw new ActionError(`${name} zorunlu.`)
  return v
}

export function ref(fd: FormData, key: string): string | null {
  const v = str(fd, key)
  return !v || v === "none" ? null : v
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key)
  if (v === null) return null
  const n = Number.parseInt(v.replace(/[^\d-]/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

export function bool(fd: FormData, key: string): number {
  const v = fd.get(key)
  return v === "on" || v === "true" || v === "1" ? 1 : 0
}

export class ActionError extends Error {}

export async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    await requireSession()
    return await fn()
  } catch (e) {
    if (e instanceof ActionError) return { error: e.message }
    console.error(e)
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata"
    return { error: `İşlem başarısız: ${msg}` }
  }
}
