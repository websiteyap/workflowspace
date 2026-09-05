import { randomBytes, scrypt } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)
const password = process.argv[2]

if (!password) {
  console.error("Kullanim: node scripts/hash-password.mjs '<parola>'")
  process.exit(1)
}

const salt = randomBytes(16)
const derived = await scryptAsync(password.normalize("NFKC"), salt, 64)

console.log("AUTH_PASSWORD_HASH=scrypt:" + salt.toString("hex") + ":" + derived.toString("hex"))
console.log("AUTH_SECRET=" + randomBytes(48).toString("base64url"))
