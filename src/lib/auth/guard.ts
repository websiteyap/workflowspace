import "server-only"
import { ipAllowed } from "./ip-allowlist"
import { activeSession } from "./store"

export class AuthError extends Error {}

export async function requireSession() {
  if (!(await ipAllowed())) throw new AuthError("Bu ağdan erişime izin verilmiyor.")
  const session = await activeSession()
  if (!session) throw new AuthError("Oturum geçersiz veya sonlandırılmış. Yeniden giriş yapın.")
  return session
}
