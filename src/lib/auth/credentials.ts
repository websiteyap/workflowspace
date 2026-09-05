import "server-only"
import { getSetting } from "./store"

const USERNAME_KEY = "auth_username"
const PASSWORD_KEY = "auth_password_hash"

export async function currentUsername() {
  return (await getSetting(USERNAME_KEY)) ?? process.env.AUTH_USERNAME ?? null
}

export async function currentPasswordHash() {
  return (await getSetting(PASSWORD_KEY)) ?? process.env.AUTH_PASSWORD_HASH ?? null
}

export async function credentialsOverridden() {
  return (await getSetting(PASSWORD_KEY)) !== null
}

export { USERNAME_KEY, PASSWORD_KEY }
