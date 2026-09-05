"use client"

const ITERATIONS = 600_000
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const CHECK_PLAINTEXT = "source-vault-v1"

function b64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function unb64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

export function randomSalt() {
  return b64(crypto.getRandomValues(new Uint8Array(16)).buffer)
}

export async function deriveKey(masterPassword: string, saltB64: string) {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: unb64(saltB64), iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

export async function encrypt(key: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext))
  return `v1.${b64(iv.buffer)}.${b64(data)}`
}

export async function decrypt(key: CryptoKey, payload: string) {
  const [version, ivPart, dataPart] = payload.split(".")
  if (version !== "v1" || !ivPart || !dataPart) throw new Error("Bozuk kayıt")
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivPart) }, key, unb64(dataPart))
  return decoder.decode(data)
}

export type VaultEntry = {
  title: string
  category: string
  username?: string
  password?: string
  url?: string
  notes?: string
}

export async function encryptEntry(key: CryptoKey, entry: VaultEntry) {
  return encrypt(key, JSON.stringify(entry))
}

export async function decryptEntry(key: CryptoKey, cipher: string): Promise<VaultEntry> {
  return JSON.parse(await decrypt(key, cipher)) as VaultEntry
}

export function generatePassword(length = 20, symbols = true) {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const extra = "!@#$%^&*()-_=+[]{}"
  const alphabet = symbols ? base + extra : base
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("")
}
