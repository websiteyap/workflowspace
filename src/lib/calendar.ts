import "server-only"
import { createHash } from "node:crypto"

export function calendarToken() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET yok")
  return createHash("sha256").update(`calendar:${secret}`).digest("hex").slice(0, 40)
}
