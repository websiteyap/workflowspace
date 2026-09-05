import "server-only"
import { activeSession } from "./store"

export class AuthError extends Error {}

export async function requireSession() {
  const session = await activeSession()
  if (!session) throw new AuthError("Oturum geçersiz veya sonlandırılmış. Yeniden giriş yapın.")
  return session
}
