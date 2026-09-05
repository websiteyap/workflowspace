import "server-only"
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH)
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string | undefined) {
  if (!stored) return false
  const [scheme, saltHex, hashHex] = stored.split(":")
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false

  let expected: Buffer
  try {
    expected = Buffer.from(hashHex, "hex")
  } catch {
    return false
  }
  if (expected.length !== KEY_LENGTH) return false

  const derived = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), KEY_LENGTH)
  return timingSafeEqual(derived, expected)
}
