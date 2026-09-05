import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const SALT = "source.secret-box.v1"

let cachedKey: Buffer | null = null

function appKey() {
  if (cachedKey) return cachedKey
  const raw = process.env.AUTH_SECRET
  if (!raw || raw.length < 32) throw new Error("AUTH_SECRET tanımlı değil.")
  cachedKey = scryptSync(raw, SALT, 32)
  return cachedKey
}

export function seal(plaintext: string, key: Buffer = appKey()) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

export function open(payload: string, key: Buffer = appKey()) {
  const [version, ivPart, tagPart, dataPart] = payload.split(".")
  if (version !== "v1" || !ivPart || !tagPart || !dataPart) throw new Error("Bozuk şifreli veri")

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"))
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function deriveKey(password: string, saltHex: string) {
  return scryptSync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), 32, { N: 2 ** 15, r: 8, p: 1 })
}

export function newSalt() {
  return randomBytes(16).toString("hex")
}
