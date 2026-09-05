import { randomBytes, scrypt } from "node:crypto"
import { promisify } from "node:util"
import { createClient } from "@libsql/client"

const scryptAsync = promisify(scrypt)
const password = process.argv[2]
const username = process.argv[3]

if (!password) {
  console.error("Kullanim: node scripts/reset-password.mjs '<yeni-parola>' [kullanici-adi]")
  process.exit(1)
}
if (password.length < 12) {
  console.error("Parola en az 12 karakter olmali.")
  process.exit(1)
}

const url = process.env.DATABASE_URL ?? "file:./data/source.db"
const client = createClient({ url })

const salt = randomBytes(16)
const derived = await scryptAsync(password.normalize("NFKC"), salt, 64)
const hash = `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`

await client.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
await client.execute({
  sql: `INSERT INTO settings (key, value) VALUES ('auth_password_hash', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  args: [hash],
})

if (username) {
  await client.execute({
    sql: `INSERT INTO settings (key, value) VALUES ('auth_username', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [username],
  })
}

try {
  await client.execute({
    sql: `UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL`,
    args: [new Date().toISOString()],
  })
} catch {
  /* oturum tablosu henuz yoksa sorun degil */
}

try {
  await client.execute(`DELETE FROM login_attempts`)
} catch {
  /* tablo yoksa sorun degil */
}

console.log("Parola sifirlandi.")
if (username) console.log("Kullanici adi:", username)
console.log("Tum oturumlar kapatildi, yeniden giris yapman gerekiyor.")
