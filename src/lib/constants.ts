export type Option = { value: string; label: string; tone: Tone }
export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet"

export const CLIENT_STATUS: Option[] = [
  { value: "lead", label: "Potansiyel", tone: "violet" },
  { value: "active", label: "Aktif", tone: "green" },
  { value: "passive", label: "Pasif", tone: "neutral" },
]

export const PROJECT_STATUS: Option[] = [
  { value: "planned", label: "Planlandı", tone: "violet" },
  { value: "active", label: "Devam ediyor", tone: "blue" },
  { value: "paused", label: "Beklemede", tone: "amber" },
  { value: "completed", label: "Tamamlandı", tone: "green" },
  { value: "cancelled", label: "İptal", tone: "red" },
]

export const PRIORITY: Option[] = [
  { value: "low", label: "Düşük", tone: "neutral" },
  { value: "medium", label: "Orta", tone: "blue" },
  { value: "high", label: "Yüksek", tone: "amber" },
  { value: "urgent", label: "Acil", tone: "red" },
]

export const TASK_STATUS: Option[] = [
  { value: "todo", label: "Yapılacak", tone: "neutral" },
  { value: "doing", label: "Devam ediyor", tone: "blue" },
  { value: "done", label: "Tamamlandı", tone: "green" },
]

export const PAYMENT_STATUS: Option[] = [
  { value: "pending", label: "Bekliyor", tone: "amber" },
  { value: "paid", label: "Ödendi", tone: "green" },
  { value: "overdue", label: "Gecikti", tone: "red" },
  { value: "cancelled", label: "İptal", tone: "neutral" },
]

export const PAYMENT_DIRECTION: Option[] = [
  { value: "incoming", label: "Tahsilat", tone: "green" },
  { value: "outgoing", label: "Ödeme", tone: "red" },
]

export const BILLING_TYPE: Option[] = [
  { value: "fixed", label: "Sabit fiyat", tone: "neutral" },
  { value: "hourly", label: "Saatlik", tone: "blue" },
  { value: "retainer", label: "Aylık abonelik", tone: "violet" },
]

export const RECURRENCE: Option[] = [
  { value: "none", label: "Tekrar yok", tone: "neutral" },
  { value: "monthly", label: "Aylık", tone: "blue" },
  { value: "quarterly", label: "3 aylık", tone: "violet" },
  { value: "yearly", label: "Yıllık", tone: "amber" },
]

export const INCOME_CATEGORIES: Option[] = [
  { value: "project", label: "Proje geliri", tone: "green" },
  { value: "maintenance", label: "Bakım / destek", tone: "blue" },
  { value: "consulting", label: "Danışmanlık", tone: "violet" },
  { value: "product", label: "Ürün / SaaS", tone: "amber" },
  { value: "other_income", label: "Diğer gelir", tone: "neutral" },
]

export const EXPENSE_CATEGORIES: Option[] = [
  { value: "software", label: "Yazılım / abonelik", tone: "blue" },
  { value: "hosting", label: "Sunucu / domain", tone: "violet" },
  { value: "hardware", label: "Donanım", tone: "amber" },
  { value: "office", label: "Ofis / kira", tone: "neutral" },
  { value: "tax", label: "Vergi / muhasebe", tone: "red" },
  { value: "marketing", label: "Pazarlama", tone: "green" },
  { value: "outsource", label: "Taşeron / freelancer", tone: "violet" },
  { value: "other_expense", label: "Diğer gider", tone: "neutral" },
]

export const PAYMENT_METHODS: Option[] = [
  { value: "transfer", label: "Havale / EFT", tone: "neutral" },
  { value: "card", label: "Kredi kartı", tone: "neutral" },
  { value: "cash", label: "Nakit", tone: "neutral" },
  { value: "wise", label: "Wise", tone: "neutral" },
  { value: "paypal", label: "PayPal", tone: "neutral" },
  { value: "crypto", label: "Kripto", tone: "neutral" },
  { value: "other", label: "Diğer", tone: "neutral" },
]

export function label(options: Option[], value: string | null | undefined) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—"
}

export function tone(options: Option[], value: string | null | undefined): Tone {
  return options.find((o) => o.value === value)?.tone ?? "neutral"
}

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
