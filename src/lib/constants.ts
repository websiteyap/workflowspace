export type Option = { value: string; label: string; tone: Tone }
export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet"

export const PROJECT_STATUS: Option[] = [
  { value: "lead", label: "Teklif", tone: "violet" },
  { value: "active", label: "Aktif", tone: "green" },
  { value: "paused", label: "Beklemede", tone: "amber" },
  { value: "completed", label: "Tamamlandı", tone: "blue" },
  { value: "cancelled", label: "İptal", tone: "red" },
]

export const BILLING_CYCLE: Option[] = [
  { value: "none", label: "Tek seferlik", tone: "neutral" },
  { value: "monthly", label: "Aylık", tone: "green" },
  { value: "quarterly", label: "3 aylık", tone: "blue" },
  { value: "biannual", label: "6 aylık", tone: "violet" },
  { value: "yearly", label: "Yıllık", tone: "amber" },
]

export const CYCLE_MONTHS: Record<string, number> = {
  none: 0,
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  yearly: 12,
}

export const ITEM_KIND: Option[] = [
  { value: "charge", label: "Müşteriye ek ücret", tone: "green" },
  { value: "cost", label: "Benim giderim", tone: "red" },
]

export const REMINDER_DAYS: Option[] = [
  { value: "0", label: "Hatırlatma yok", tone: "neutral" },
  { value: "1", label: "1 gün önce", tone: "blue" },
  { value: "3", label: "3 gün önce", tone: "blue" },
  { value: "7", label: "1 hafta önce", tone: "amber" },
  { value: "14", label: "2 hafta önce", tone: "violet" },
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

export const VAULT_CATEGORY: Option[] = [
  { value: "server", label: "Sunucu / SSH", tone: "violet" },
  { value: "hosting", label: "Hosting / panel", tone: "blue" },
  { value: "api", label: "API anahtarı", tone: "amber" },
  { value: "database", label: "Veritabanı", tone: "green" },
  { value: "client", label: "Müşteri erişimi", tone: "neutral" },
  { value: "other", label: "Diğer", tone: "neutral" },
]

export const GOAL_TYPE: Option[] = [
  { value: "subscription", label: "Abonelik", tone: "violet" },
  { value: "book", label: "Kitap", tone: "amber" },
  { value: "article", label: "Makale / kurs", tone: "blue" },
  { value: "gadget", label: "Cihaz / donanım", tone: "neutral" },
  { value: "tool", label: "Araç / yazılım", tone: "green" },
  { value: "other", label: "Diğer", tone: "neutral" },
]

export const GOAL_STATUS: Option[] = [
  { value: "open", label: "Açık", tone: "blue" },
  { value: "done", label: "Tamamlandı", tone: "green" },
  { value: "dropped", label: "Vazgeçildi", tone: "neutral" },
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
