import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const PERIOD = 30
const DIGITS = 6
const WINDOW = 1

export function generateSecret(bytes = 20) {
  return base32Encode(randomBytes(bytes))
}

export function base32Encode(buffer: Buffer) {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "")
  let bits = 0
  let value = 0
  const output: number[] = []
  for (const char of clean) {
    const index = ALPHABET.indexOf(char)
    if (index === -1) throw new Error("Geçersiz base32 karakteri")
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

function hotp(secret: Buffer, counter: number) {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buffer.writeUInt32BE(counter >>> 0, 4)

  const digest = createHmac("sha1", secret).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0")
}

export function currentCode(secretBase32: string, at = Date.now()) {
  return hotp(base32Decode(secretBase32), Math.floor(at / 1000 / PERIOD))
}

export function verifyCode(secretBase32: string, code: string, at = Date.now()) {
  const clean = code.replace(/\D/g, "")
  if (clean.length !== DIGITS) return false

  const secret = base32Decode(secretBase32)
  const counter = Math.floor(at / 1000 / PERIOD)
  const candidate = Buffer.from(clean)

  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const expected = Buffer.from(hotp(secret, counter + drift))
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) return true
  }
  return false
}

export function otpauthUrl(secret: string, account: string, issuer = "Source") {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
