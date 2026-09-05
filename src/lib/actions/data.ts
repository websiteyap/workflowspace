"use server"

import { revalidatePath } from "next/cache"
import { db, ready } from "@/db"
import { clients, notes, payments, projects, tasks, transactions } from "@/db/schema"
import { addDays, addMonths, todayISO } from "@/lib/format"
import { newId, nowISO } from "./helpers"

const PATHS = ["/", "/gorevler", "/notlar", "/musteriler", "/projeler", "/odemeler", "/finans", "/ayarlar"]
const touchAll = () => PATHS.forEach((p) => revalidatePath(p))

export async function clearAllData() {
  await ready()
  await db.delete(transactions)
  await db.delete(payments)
  await db.delete(tasks)
  await db.delete(notes)
  await db.delete(projects)
  await db.delete(clients)
  touchAll()
}

export async function exportData() {
  await ready()
  const [c, p, t, n, pm, tx] = await Promise.all([
    db.select().from(clients),
    db.select().from(projects),
    db.select().from(tasks),
    db.select().from(notes),
    db.select().from(payments),
    db.select().from(transactions),
  ])
  return JSON.stringify(
    { version: 1, exportedAt: nowISO(), clients: c, projects: p, tasks: t, notes: n, payments: pm, transactions: tx },
    null,
    2,
  )
}

export async function seedDemoData() {
  await ready()
  await clearAllData()

  const today = todayISO()
  const ts = nowISO()

  const clientRows = [
    {
      id: newId(),
      name: "Elif Demir",
      company: "Atlas Lojistik",
      email: "elif@atlaslojistik.com",
      phone: "+90 532 114 22 08",
      website: "atlaslojistik.com",
      status: "active",
      currency: "TRY",
      hourlyRate: 180000,
      taxOffice: "Kadıköy",
      taxNumber: "3410559827",
      notes: "Ödemeleri düzenli, faturayı ayın ilk haftasında istiyor. İletişim WhatsApp üzerinden.",
    },
    {
      id: newId(),
      name: "Northwind Studio",
      company: "Northwind Studio LLC",
      email: "hello@northwind.studio",
      phone: "+1 415 555 0142",
      website: "northwind.studio",
      status: "active",
      currency: "TRY",
      hourlyRate: 220000,
      notes: "Saatlik çalışıyoruz, ayın sonunda Wise ile ödeme yapıyorlar. Kur farkı için sözleşmede madde var.",
    },
    {
      id: newId(),
      name: "Mert Kaya",
      company: "Kaya Diş Kliniği",
      email: "info@kayadis.com",
      phone: "+90 555 903 71 40",
      status: "active",
      currency: "TRY",
      notes: "Yıllık bakım anlaşması var.",
    },
    {
      id: newId(),
      name: "Selin Aydın",
      company: "Vega Kozmetik",
      email: "selin@vegakozmetik.com",
      status: "lead",
      currency: "TRY",
      notes: "E-ticaret projesi için teklif bekliyor. Bütçe aralığı 250–350 bin.",
    },
  ]
  await db.insert(clients).values(clientRows.map((c) => ({ ...c, createdAt: ts, updatedAt: ts })))
  const [atlas, northwind, kaya, vega] = clientRows

  const projectRows = [
    {
      id: newId(),
      clientId: atlas.id,
      name: "Atlas — Sevkiyat takip paneli",
      description:
        "Filo ve sevkiyat durumunu canlı gösteren iç panel. Rol bazlı yetkilendirme, Excel dışa aktarım ve mobil görünüm dahil.",
      status: "active",
      priority: "high",
      billingType: "fixed",
      budget: 32000000,
      currency: "TRY",
      progress: 65,
      startDate: addMonths(today, -2),
      dueDate: addDays(today, 24),
      stack: "Next.js, PostgreSQL, Prisma, Tailwind",
      repoUrl: "github.com/sarp/atlas-panel",
      tags: "web, panel",
    },
    {
      id: newId(),
      clientId: northwind.id,
      name: "Northwind — Design system entegrasyonu",
      description: "Mevcut React uygulamasının tasarım sistemine taşınması ve komponent kütüphanesinin kurulması.",
      status: "active",
      priority: "medium",
      billingType: "hourly",
      hourlyRate: 220000,
      currency: "TRY",
      progress: 40,
      startDate: addMonths(today, -1),
      dueDate: addDays(today, 45),
      stack: "React, Storybook, TypeScript",
      tags: "frontend",
    },
    {
      id: newId(),
      clientId: kaya.id,
      name: "Kaya Klinik — Kurumsal site & randevu",
      description: "Kurumsal web sitesi, online randevu formu ve Google Ads landing sayfaları.",
      status: "completed",
      priority: "medium",
      billingType: "fixed",
      budget: 8500000,
      currency: "TRY",
      progress: 100,
      startDate: addMonths(today, -5),
      dueDate: addMonths(today, -3),
      completedAt: ts,
      liveUrl: "https://kayadis.com",
      stack: "Next.js, Sanity",
      tags: "web",
    },
    {
      id: newId(),
      clientId: vega.id,
      name: "Vega — E-ticaret altyapısı (teklif)",
      description: "Shopify'dan headless mimariye geçiş için kapsam çalışması ve teklif hazırlığı.",
      status: "planned",
      priority: "low",
      billingType: "fixed",
      budget: 28000000,
      currency: "TRY",
      progress: 0,
      dueDate: addDays(today, 60),
      tags: "e-ticaret",
    },
    {
      id: newId(),
      clientId: null,
      name: "Kendi ürünüm — Fatura asistanı",
      description: "Freelancerlar için otomatik fatura ve hatırlatma aracı. Hafta sonları ilerliyorum.",
      status: "active",
      priority: "low",
      billingType: "fixed",
      currency: "TRY",
      progress: 20,
      stack: "Next.js, SQLite",
      tags: "ürün, saas",
    },
  ]
  await db.insert(projects).values(projectRows.map((p) => ({ ...p, createdAt: ts, updatedAt: ts })))
  const [atlasP, nwP, kayaP, vegaP, ownP] = projectRows

  const taskRows = [
    { title: "Sevkiyat listesi için sunucu tarafı filtreleme", projectId: atlasP.id, dueDate: today, priority: "high", status: "doing" },
    { title: "Rol bazlı yetki matrisini Elif ile netleştir", projectId: atlasP.id, dueDate: today, priority: "urgent", status: "todo" },
    { title: "Storybook'a tipografi tokenlarını ekle", projectId: nwP.id, dueDate: today, priority: "medium", status: "todo" },
    { title: "Fatura asistanı — PDF şablonunu tasarla", projectId: ownP.id, dueDate: today, priority: "low", status: "todo" },
    { title: "Atlas panel v1 demo videosu çek", projectId: atlasP.id, dueDate: addDays(today, 1), priority: "medium", status: "todo" },
    { title: "Vega için kapsam dokümanını tamamla", projectId: vegaP.id, dueDate: addDays(today, 2), priority: "high", status: "todo" },
    { title: "Northwind haftalık saat raporunu gönder", projectId: nwP.id, dueDate: addDays(today, 4), priority: "medium", status: "todo" },
    { title: "Muhasebeciye ay sonu gider dökümünü ilet", projectId: null, dueDate: addDays(today, 6), priority: "medium", status: "todo" },
    { title: "Sunucu yedekleme scriptini gözden geçir", projectId: null, dueDate: addDays(today, 12), priority: "low", status: "todo" },
    { title: "Kaya Klinik SEO raporunu paylaş", projectId: kayaP.id, dueDate: addDays(today, -3), priority: "high", status: "todo" },
    { title: "Atlas — harita bileşeninin performansını ölç", projectId: atlasP.id, dueDate: addDays(today, -1), priority: "medium", status: "todo" },
    { title: "Portfolyo sitesine yeni vaka çalışması ekle", projectId: null, dueDate: null, priority: "low", status: "todo" },
    { title: "Atlas veritabanı şemasını kur", projectId: atlasP.id, dueDate: addDays(today, -14), priority: "high", status: "done" },
    { title: "Northwind kickoff toplantısı", projectId: nwP.id, dueDate: addDays(today, -20), priority: "medium", status: "done" },
    { title: "Kaya Klinik siteyi canlıya al", projectId: kayaP.id, dueDate: addDays(today, -90), priority: "high", status: "done" },
  ]
  await db.insert(tasks).values(
    taskRows.map((t, i) => ({
      id: newId(),
      projectId: t.projectId,
      clientId: null,
      title: t.title,
      description: null,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      estimateMinutes: null,
      spentMinutes: 0,
      position: i,
      completedAt: t.status === "done" ? ts : null,
      createdAt: ts,
      updatedAt: ts,
    })),
  )

  const noteRows = [
    {
      title: "Atlas — teknik kararlar",
      content:
        "Karar özeti:\n\n- Harita için MapLibre (Google Maps kotası pahalı)\n- Sevkiyat listesi sunucu tarafında sayfalanacak (30k+ kayıt)\n- Excel çıktısı için worker kuyruğu\n\nElif onayladı, 14 Mart toplantısı.",
      projectId: atlasP.id,
      clientId: atlas.id,
      tags: "karar, mimari",
      pinned: 1,
    },
    {
      title: "Faturalandırma kontrol listesi",
      content:
        "Her ayın 1'i:\n1. Northwind saat dökümünü çıkar\n2. Atlas hakediş faturasını kes\n3. Bakım anlaşmalarını kontrol et\n4. Giderleri kategorile\n5. KDV tutarını ayır",
      projectId: null,
      clientId: null,
      tags: "muhasebe, rutin",
      pinned: 1,
    },
    {
      title: "Postgres — yavaş sorgu notu",
      content:
        "Sevkiyat sorgusu 2.4s sürüyordu.\n\nEXPLAIN ANALYZE ile bakınca (status, created_at) üzerinde composite index eksikti.\nIndex sonrası 40ms.\n\nNot: partial index de denenebilir (status='active').",
      projectId: atlasP.id,
      clientId: null,
      tags: "sql, performans",
      pinned: 0,
    },
    {
      title: "Vega görüşme notları",
      content:
        "Selin ile ön görüşme:\n- Aylık ~12k sipariş\n- Shopify'da tema kısıtları can sıkıyor\n- Bütçe 250-350k, Q3 hedefi\n- Karar verici Selin + teknik danışmanları\n\nTeklifi 2 hafta içinde göndereceğim.",
      projectId: vegaP.id,
      clientId: vega.id,
      tags: "toplantı, satış",
      pinned: 0,
    },
    {
      title: "Fiyatlandırma düşüncesi",
      content:
        "Sabit fiyat projelerinde %20 risk payı ekle. Saatlik işlerde minimum 10 saat blok sat.\nYurt dışı işlerde kur farkı için sözleşmeye madde koy.",
      projectId: null,
      clientId: null,
      tags: "fikir, fiyatlandırma",
      pinned: 0,
    },
  ]
  await db.insert(notes).values(noteRows.map((n) => ({ id: newId(), ...n, createdAt: ts, updatedAt: ts })))

  const paymentRows = [
    {
      clientId: atlas.id,
      projectId: atlasP.id,
      title: "Atlas — 2. hakediş",
      direction: "incoming",
      amount: 12000000,
      currency: "TRY",
      status: "pending",
      dueDate: addDays(today, 9),
      invoiceNo: "2026-014",
      method: "transfer",
      recurrence: "none",
    },
    {
      clientId: northwind.id,
      projectId: nwP.id,
      title: "Northwind — Mart saatleri (42 sa)",
      direction: "incoming",
      amount: 9240000,
      currency: "TRY",
      status: "pending",
      dueDate: addDays(today, 3),
      method: "wise",
      recurrence: "monthly",
    },
    {
      clientId: kaya.id,
      projectId: kayaP.id,
      title: "Kaya Klinik — yıllık bakım",
      direction: "incoming",
      amount: 2400000,
      currency: "TRY",
      status: "pending",
      dueDate: addDays(today, -6),
      invoiceNo: "2026-011",
      method: "transfer",
      recurrence: "yearly",
    },
    {
      clientId: null,
      projectId: null,
      title: "Muhasebeci aylık ücreti",
      direction: "outgoing",
      amount: 450000,
      currency: "TRY",
      status: "pending",
      dueDate: addDays(today, 12),
      method: "transfer",
      recurrence: "monthly",
    },
    {
      clientId: atlas.id,
      projectId: atlasP.id,
      title: "Atlas — 1. hakediş",
      direction: "incoming",
      amount: 10000000,
      currency: "TRY",
      status: "paid",
      dueDate: addMonths(today, -1),
      paidDate: addMonths(today, -1),
      invoiceNo: "2026-006",
      method: "transfer",
      recurrence: "none",
    },
  ]
  await db.insert(payments).values(
    paymentRows.map((p) => ({ id: newId(), ...p, issueDate: null, notes: null, createdAt: ts, updatedAt: ts })),
  )

  const m = (offset: number, day: number) => {
    const base = addMonths(today, offset)
    return `${base.slice(0, 8)}${String(day).padStart(2, "0")}`
  }

  const txRows = [
    { type: "income", amount: 10000000, category: "project", description: "Atlas — 1. hakediş", date: m(-1, 12), clientId: atlas.id, projectId: atlasP.id, method: "transfer" },
    { type: "income", amount: 8500000, category: "project", description: "Kaya Klinik — proje bakiyesi", date: m(-3, 8), clientId: kaya.id, projectId: kayaP.id, method: "transfer" },
    { type: "income", amount: 8800000, category: "consulting", description: "Northwind — Şubat saatleri", date: m(-1, 28), clientId: northwind.id, projectId: nwP.id, method: "wise" },
    { type: "income", amount: 9460000, category: "consulting", description: "Northwind — Ocak saatleri", date: m(-2, 27), clientId: northwind.id, projectId: nwP.id, method: "wise" },
    { type: "income", amount: 2400000, category: "maintenance", description: "Kaya Klinik — bakım (geçen yıl)", date: m(-4, 5), clientId: kaya.id, projectId: kayaP.id, method: "transfer" },
    { type: "income", amount: 4500000, category: "project", description: "Eski müşteri — landing page", date: m(-2, 15), clientId: null, projectId: null, method: "transfer" },
    { type: "income", amount: 6200000, category: "project", description: "Atlas — analiz ve kapsam çalışması", date: m(-2, 3), clientId: atlas.id, projectId: atlasP.id, method: "transfer" },
    { type: "expense", amount: 89000, category: "software", description: "JetBrains + Figma abonelikleri", date: m(0, 3), method: "card" },
    { type: "expense", amount: 42000, category: "hosting", description: "Vercel Pro + Neon", date: m(0, 5), method: "card" },
    { type: "expense", amount: 450000, category: "tax", description: "Muhasebeci ücreti", date: m(0, 8), method: "transfer" },
    { type: "expense", amount: 1250000, category: "hardware", description: "Yedek monitör ve klavye", date: m(-1, 18), method: "card" },
    { type: "expense", amount: 89000, category: "software", description: "JetBrains + Figma abonelikleri", date: m(-1, 3), method: "card" },
    { type: "expense", amount: 42000, category: "hosting", description: "Vercel Pro + Neon", date: m(-1, 5), method: "card" },
    { type: "expense", amount: 450000, category: "tax", description: "Muhasebeci ücreti", date: m(-1, 8), method: "transfer" },
    { type: "expense", amount: 2800000, category: "outsource", description: "Freelance tasarımcı — Atlas UI", date: m(-2, 20), projectId: atlasP.id, method: "transfer" },
    { type: "expense", amount: 89000, category: "software", description: "JetBrains + Figma abonelikleri", date: m(-2, 3), method: "card" },
    { type: "expense", amount: 380000, category: "office", description: "Ortak çalışma alanı", date: m(-2, 1), method: "card" },
    { type: "expense", amount: 620000, category: "marketing", description: "Portfolyo reklamı", date: m(-3, 14), method: "card" },
    { type: "expense", amount: 89000, category: "software", description: "JetBrains + Figma abonelikleri", date: m(-3, 3), method: "card" },
    { type: "income", amount: 3200000, category: "product", description: "Fatura asistanı — erken erişim satışları", date: m(0, 10), projectId: ownP.id, method: "card" },
  ]
  await db.insert(transactions).values(
    txRows.map((t) => ({
      id: newId(),
      type: t.type,
      amount: t.amount,
      currency: "TRY",
      category: t.category,
      description: t.description,
      date: t.date,
      clientId: t.clientId ?? null,
      projectId: t.projectId ?? null,
      paymentId: null,
      method: t.method,
      createdAt: ts,
    })),
  )

  touchAll()
}
