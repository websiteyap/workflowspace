import "server-only"
import { headers } from "next/headers"
import { getSetting, setSetting } from "./store"

const KEY = "allowed_ips"

export async function clientIp() {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || h.get("x-real-ip")?.trim() || null
}

export async function allowedIps() {
  const raw = await getSetting(KEY)
  return (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

export async function saveAllowedIps(list: string[]) {
  await setSetting(KEY, list.map((v) => v.trim()).filter(Boolean).join(","))
}

function matches(ip: string, rule: string) {
  if (rule === ip) return true
  if (rule.endsWith("*")) return ip.startsWith(rule.slice(0, -1))
  if (rule.endsWith(".")) return ip.startsWith(rule)
  return false
}

export async function ipAllowed() {
  const list = await allowedIps()
  if (list.length === 0) return true
  const ip = await clientIp()
  if (!ip) return true
  return list.some((rule) => matches(ip, rule))
}
