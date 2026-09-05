import {
  ArrowLeft,
  Building2,
  CircleDollarSign,
  Globe,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ALL_CATEGORIES, CLIENT_STATUS, PAYMENT_STATUS, PROJECT_STATUS, label as labelOf } from "@/lib/constants"
import { formatDate, initials, money, relativeDay } from "@/lib/format"
import { clientDetail, lookups } from "@/lib/queries"
import { ClientHeaderActions } from "./client-actions"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await clientDetail(id)
  return { title: data?.client.name ?? "Müşteri" }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, look] = await Promise.all([clientDetail(id), lookups()])
  if (!data) notFound()

  const { client, projects, payments, transactions, notes, earned, pending } = data
  const contact = [
    client.email && { icon: Mail, text: client.email, href: `mailto:${client.email}` },
    client.phone && { icon: Phone, text: client.phone, href: `tel:${client.phone}` },
    client.website && {
      icon: Globe,
      text: client.website,
      href: client.website.startsWith("http") ? client.website : `https://${client.website}`,
    },
    client.address && { icon: MapPin, text: client.address },
  ].filter(Boolean) as { icon: typeof Mail; text: string; href?: string }[]

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 text-muted-foreground">
        <Link href="/musteriler">
          <ArrowLeft className="size-4" /> Müşteriler
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {initials(client.name)}
          </span>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <StatusBadge options={CLIENT_STATUS} value={client.status} />
            </div>
            {client.company && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="size-3.5" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <ClientHeaderActions client={client} clients={look.clients} projects={look.projects} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam tahsilat" value={money(earned, client.currency)} icon={Wallet} accent="positive" />
        <StatCard label="Bekleyen" value={money(pending, client.currency)} icon={CircleDollarSign} />
        <StatCard label="Proje" value={String(projects.length)} icon={Receipt} hint={`${projects.filter((p) => p.status === "active").length} aktif`} />
        <StatCard
          label="Saatlik ücret"
          value={client.hourlyRate ? money(client.hourlyRate, client.currency) : "—"}
          hint={client.currency}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Projeler</h2>
            </div>
            {projects.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Bu müşteriye ait proje yok.</p>
            ) : (
              <ul className="divide-y">
                {projects.map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <Link href={`/projeler/${p.id}`} className="group block space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium group-hover:underline">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.dueDate ? `Teslim: ${formatDate(p.dueDate)}` : "Teslim tarihi yok"}
                            {p.budget ? ` · Bütçe ${money(p.budget, p.currency)}` : ""}
                          </p>
                        </div>
                        <StatusBadge options={PROJECT_STATUS} value={p.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1.5" />
                        <span className="w-9 shrink-0 text-right text-xs tabular text-muted-foreground">%{p.progress}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Ödemeler</h2>
            </div>
            {payments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Ödeme kaydı yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Başlık</TableHead>
                    <TableHead>Vade</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        <span className="tabular">{formatDate(p.dueDate)}</span>
                        {p.status === "pending" && <span className="block text-xs">{relativeDay(p.dueDate)}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular font-medium">{money(p.amount, p.currency)}</TableCell>
                      <TableCell>
                        <StatusBadge options={PAYMENT_STATUS} value={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Son finansal hareketler</h2>
            </div>
            {transactions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Hareket yok.</p>
            ) : (
              <ul className="divide-y">
                {transactions.slice(0, 10).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-20 shrink-0 tabular text-xs text-muted-foreground">{formatDate(t.date)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {t.description || labelOf(ALL_CATEGORIES, t.category)}
                    </span>
                    <span
                      className={
                        t.type === "income" ? "tabular font-medium text-emerald-600 dark:text-emerald-400" : "tabular font-medium"
                      }
                    >
                      {t.type === "income" ? "+" : "−"}
                      {money(t.amount, t.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">İletişim</h2>
            {contact.length === 0 ? (
              <p className="text-sm text-muted-foreground">İletişim bilgisi girilmemiş.</p>
            ) : (
              <ul className="space-y-2.5">
                {contact.map((c) => (
                  <li key={c.text} className="flex items-start gap-2.5 text-sm">
                    <c.icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    {c.href ? (
                      <a href={c.href} target="_blank" rel="noreferrer" className="break-all hover:underline">
                        {c.text}
                      </a>
                    ) : (
                      <span className="break-words text-muted-foreground">{c.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {(client.taxNumber || client.taxOffice) && (
              <div className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {client.taxOffice && <p>Vergi dairesi: {client.taxOffice}</p>}
                {client.taxNumber && <p>Vergi no: {client.taxNumber}</p>}
              </div>
            )}
          </section>

          {client.notes && (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium">Müşteri notu</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{client.notes}</p>
            </section>
          )}

          {notes.length > 0 && (
            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-medium">İlgili notlar</h2>
              </div>
              <ul className="divide-y">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
