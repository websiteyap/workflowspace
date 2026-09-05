export const CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const
export type Currency = (typeof CURRENCIES)[number]
export const BASE_CURRENCY = "TRY"

export type RateMap = Record<string, number>

export const CURRENCY_SYMBOL: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
}

export function rateFor(currency: string, rates: RateMap) {
  return rates[currency] ?? 1
}

export function toBase(amountMinor: number, currency: string, rates: RateMap) {
  return Math.round(amountMinor * rateFor(currency, rates))
}

export function fromBase(baseMinor: number, currency: string, rates: RateMap) {
  return Math.round(baseMinor / rateFor(currency, rates))
}

export function formatBase(
  baseMinor: number | null | undefined,
  display: string,
  rates: RateMap,
  opts?: { compact?: boolean },
) {
  return money(fromBase(baseMinor ?? 0, display, rates), display, opts)
}

export function money(minor: number | null | undefined, currency = "TRY", opts?: { compact?: boolean }) {
  const value = (minor ?? 0) / 100
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: opts?.compact ? 1 : value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
    notation: opts?.compact && Math.abs(value) >= 10000 ? "compact" : "standard",
  }).format(value)
}

export function toMinor(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0
  if (typeof input === "number") return Math.round(input * 100)
  const raw = input.trim().replace(/[^\d,.-]/g, "")
  if (!raw) return 0
  const lastComma = raw.lastIndexOf(",")
  const lastDot = raw.lastIndexOf(".")
  let normalized: string
  if (lastComma > lastDot) normalized = raw.replace(/\./g, "").replace(",", ".")
  else if (lastDot > lastComma) normalized = raw.replace(/,/g, "")
  else normalized = raw.replace(/[.,]/g, "")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export function minorToInput(minor: number | null | undefined) {
  if (minor === null || minor === undefined) return ""
  return (minor / 100).toFixed(2).replace(/\.00$/, "")
}

export function num(n: number) {
  return new Intl.NumberFormat("tr-TR").format(n)
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const date = new Date(y, m - 1 + months, 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(d, lastDay))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function monthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  const f = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { start: f(start), end: f(end), label: start.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) }
}

export function formatDate(iso: string | null | undefined, style: "short" | "long" = "short") {
  if (!iso) return "—"
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("tr-TR",
    style === "long"
      ? { day: "numeric", month: "long", year: "numeric" }
      : { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function daysFromToday(iso: string | null | undefined) {
  if (!iso) return null
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function relativeDay(iso: string | null | undefined) {
  const diff = daysFromToday(iso)
  if (diff === null) return "—"
  if (diff === 0) return "Bugün"
  if (diff === 1) return "Yarın"
  if (diff === -1) return "Dün"
  if (diff > 0) return `${diff} gün sonra`
  return `${Math.abs(diff)} gün gecikti`
}

export function duration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} dk`
  if (m === 0) return `${h} saat`
  return `${h}s ${m}dk`
}

export function localInputToISO(value: string | null | undefined) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function reminderLabel(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  const diff = daysFromToday(d.toISOString().slice(0, 10) === "" ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  if (diff === 0) return `Bugün ${time}`
  if (diff === 1) return `Yarın ${time}`
  if (diff === -1) return `Dün ${time}`
  return `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${time}`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR"))
    .join("")
}
