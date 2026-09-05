"use client"

import {
  Bell,
  BellOff,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  Trash2,
  Wallet,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { ConfirmDialog, FormDialog } from "@/components/forms/form-dialog"
import { AreaField, FormGrid, MoneyField, SelectField, TextField } from "@/components/forms/fields"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AlertEvent, AlertRule, Holding, Wallet as WalletRow } from "@/db/schema"
import {
  addWalletToken,
  deleteAlertRule,
  deleteHolding,
  deleteWallet,
  findCoins,
  markAlertsRead,
  removeWalletBalance,
  saveAlertRule,
  saveHolding,
  saveWallet,
  syncWallets,
  toggleAlertRule,
} from "@/lib/actions/investments"
import { CURRENCIES, type RateMap, formatBase, formatDateTime, minorToInput } from "@/lib/format"
import { PortfolioChart, type PortfolioPoint } from "@/components/charts/portfolio-chart"
import { cn } from "@/lib/utils"

export type Quote = {
  coinId: string
  symbol: string
  priceUsd: number
  priceTry: number
  change24h: number
  updatedAt: string
  stale: boolean
}

export type WalletRowWithBalances = WalletRow & {
  balances: {
    id: string
    kind: string
    symbol: string
    amount: string
    coinId: string | null
    valueBase: number
    updatedAt: string
  }[]
  totalBase: number
}

export type Position = Holding & {
  quote: Quote | null
  valueBase: number
  costBase: number
  pnlBase: number
  pnlPercent: number | null
}

const CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "bsc", label: "BNB Chain" },
  { value: "polygon", label: "Polygon" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "solana", label: "Solana" },
  { value: "tron", label: "Tron" },
  { value: "other", label: "Diğer" },
]

const EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  bsc: "https://bscscan.com/address/",
  polygon: "https://polygonscan.com/address/",
  bitcoin: "https://mempool.space/address/",
  solana: "https://solscan.io/account/",
  tron: "https://tronscan.org/#/address/",
}

const KINDS = [
  { value: "crypto", label: "Kripto (canlı fiyat)" },
  { value: "manual", label: "Diğer (elle fiyat)" },
]

const ALERT_KINDS = [
  { value: "price_below", label: "Fiyat altına inerse ($)" },
  { value: "price_above", label: "Fiyat üstüne çıkarsa ($)" },
  { value: "drop_24h", label: "24 saatte düşerse (%)" },
  { value: "rise_24h", label: "24 saatte çıkarsa (%)" },
  { value: "sma50_cross_down", label: "50 günlük ortalamanın altına inerse" },
  { value: "sma50_cross_up", label: "50 günlük ortalamayı geçerse" },
  { value: "rsi_below", label: "RSI altına inerse (30)" },
  { value: "rsi_above", label: "RSI üstüne çıkarsa (70)" },
]

function CoinPicker({
  defaultCoinId,
  defaultSymbol,
  defaultName,
}: {
  defaultCoinId?: string | null
  defaultSymbol?: string
  defaultName?: string | null
}) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<{ id: string; symbol: string; name: string }[]>([])
  const [picked, setPicked] = React.useState(
    defaultCoinId ? { id: defaultCoinId, symbol: defaultSymbol ?? "", name: defaultName ?? "" } : null,
  )
  const [searching, setSearching] = React.useState(false)

  const search = async () => {
    setSearching(true)
    try {
      setResults(await findCoins(query))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label className="text-xs font-medium text-muted-foreground">Varlık</Label>
      <input type="hidden" name="coinId" value={picked?.id ?? ""} />
      <input type="hidden" name="symbol" value={picked?.symbol ?? ""} />
      <input type="hidden" name="name" value={picked?.name ?? ""} />

      {picked ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="font-medium">{picked.symbol}</span>
          <span className="text-sm text-muted-foreground">{picked.name}</span>
          <Button type="button" variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setPicked(null)}>
            Değiştir
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void search()
                }
              }}
              placeholder="bitcoin, ethereum, solana…"
            />
            <Button type="button" variant="outline" onClick={search} disabled={searching || query.length < 2}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : "Ara"}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {results.map((coin) => (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => {
                    setPicked(coin)
                    setResults([])
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{coin.symbol}</span>
                  <span className="truncate text-muted-foreground">{coin.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function HoldingDialog({
  holding,
  wallets,
  open,
  onOpenChange,
  trigger,
}: {
  holding?: Holding
  wallets: WalletRow[]
  open?: boolean
  onOpenChange?: (o: boolean) => void
  trigger?: React.ReactNode
}) {
  const [currency, setCurrency] = React.useState(holding?.currency ?? "TRY")
  const [kind, setKind] = React.useState(holding?.kind ?? "crypto")

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={holding ? "Varlığı düzenle" : "Varlık ekle"}
      description="Kriptoda fiyat canlı çekilir; diğer varlıklarda birim fiyatı sen girersin."
      action={saveHolding}
      successMessage={holding ? "Güncellendi" : "Eklendi"}
    >
      {holding && <input type="hidden" name="id" value={holding.id} />}
      <FormGrid>
        <SelectField
          name="kind"
          label="Varlık türü"
          options={KINDS}
          defaultValue={kind}
          onValueChange={setKind}
          full
        />
        {kind === "crypto" ? (
          <CoinPicker
            defaultCoinId={holding?.coinId}
            defaultSymbol={holding?.symbol}
            defaultName={holding?.name}
          />
        ) : (
          <>
            <TextField name="symbol" label="Sembol" required defaultValue={holding?.symbol ?? ""} placeholder="GRAM ALTIN" />
            <TextField name="name" label="Ad" defaultValue={holding?.name ?? ""} placeholder="Gram altın" />
            <MoneyField
              name="manualPrice"
              label="Birim fiyat"
              currency={currency}
              defaultValue={minorToInput(holding?.manualPrice)}
              hint="Güncel birim fiyatı elle güncellersin"
            />
          </>
        )}
        <TextField name="amount" label="Miktar" required defaultValue={holding?.amount ?? ""} placeholder="0.25" />
        <SelectField
          name="walletId"
          label="Cüzdan"
          options={wallets.map((w) => ({ value: w.id, label: w.label }))}
          defaultValue={holding?.walletId ?? "none"}
          allowEmpty
          emptyLabel="Belirtilmedi"
        />
        <MoneyField
          name="costBasis"
          label="Toplam maliyet"
          currency={currency}
          defaultValue={minorToInput(holding?.costBasis)}
          hint="Bu varlığa toplam ne ödedin"
        />
        <SelectField
          name="currency"
          label="Para birimi"
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          defaultValue={currency}
          onValueChange={setCurrency}
        />
        <AreaField name="notes" label="Not" rows={2} defaultValue={holding?.notes ?? ""} />
      </FormGrid>
    </FormDialog>
  )
}

export function InvestmentsClient({
  positions,
  wallets,
  rules,
  events,
  history,
  display,
  rates,
  usdRate,
}: {
  positions: Position[]
  wallets: WalletRowWithBalances[]
  rules: AlertRule[]
  events: AlertEvent[]
  history: PortfolioPoint[]
  display: string
  rates: RateMap
  usdRate: number
}) {
  const [editHolding, setEditHolding] = React.useState<Holding | null>(null)
  const [addHolding, setAddHolding] = React.useState(false)
  const [addWallet, setAddWallet] = React.useState(false)
  const [addRule, setAddRule] = React.useState(false)
  const [delHolding, setDelHolding] = React.useState<Position | null>(null)
  const [delWallet, setDelWallet] = React.useState<WalletRow | null>(null)
  const [syncing, setSyncing] = React.useState(false)
  const [tokenFor, setTokenFor] = React.useState<string | null>(null)
  const [tokenContract, setTokenContract] = React.useState("")
  const [, start] = React.useTransition()

  const fmt = (v: number) => formatBase(v, display, rates)
  const totalValue = positions.reduce((a, p) => a + p.valueBase, 0)
  const totalCost = positions.reduce((a, p) => a + p.costBase, 0)
  const pnl = totalValue - totalCost
  const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : null
  const unread = events.filter((e) => !e.readAt)
  const anyStale = positions.some((p) => p.quote?.stale)

  const concentration = React.useMemo(() => {
    if (totalValue <= 0) return null
    const top = [...positions].sort((a, b) => b.valueBase - a.valueBase)[0]
    if (!top) return null
    const percent = (top.valueBase / totalValue) * 100
    return percent >= 60 ? { symbol: top.symbol, percent } : null
  }, [positions, totalValue])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yatırım"
        description={`${positions.length} varlık · fiyatlar CoinGecko`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddWallet(true)}>
              <Wallet className="size-4" /> Cüzdan
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddHolding(true)}>
              <Plus className="size-4" /> Varlık
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Portföy değeri" value={fmt(totalValue)} />
        <StatCard label="Toplam maliyet" value={fmt(totalCost)} />
        <StatCard
          label="Kâr / zarar"
          value={fmt(pnl)}
          accent={pnl >= 0 ? "positive" : "negative"}
          delta={pnlPercent}
          hint={totalCost > 0 ? "maliyete göre" : "maliyet girilmedi"}
        />
        <StatCard
          label="Açık uyarı"
          value={String(unread.length)}
          accent={unread.length > 0 ? "negative" : undefined}
          hint={`${rules.filter((r) => r.enabled === 1).length} aktif kural`}
        />
      </div>

      {anyStale && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] px-4 py-2.5 text-xs text-muted-foreground">
          Bazı fiyatlar güncellenemedi, önbellekteki son değerler gösteriliyor.
        </p>
      )}

      {concentration && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-sm">
            <span className="font-medium">Portföyün %{concentration.percent.toFixed(0)}&apos;i {concentration.symbol}&apos;de.</span>{" "}
            <span className="text-muted-foreground">
              Tek varlıkta yoğunlaşma riski artırır; dağıtmayı değerlendirebilirsin.
            </span>
          </p>
        </div>
      )}

      {positions.length > 0 && (
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Portföy geçmişi</h2>
            <p className="text-xs text-muted-foreground">Günlük anlık görüntüler · {display}</p>
          </div>
          <div className="p-4">
            <PortfolioChart data={history} currency={display} />
          </div>
        </section>
      )}

      {unread.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex items-center justify-between border-b border-amber-500/20 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Bell className="size-4 text-amber-600 dark:text-amber-400" />
              Yeni uyarılar
            </h2>
            <Button variant="ghost" size="sm" onClick={() => start(() => markAlertsRead())}>
              Okundu işaretle
            </Button>
          </div>
          <ul className="divide-y divide-amber-500/15">
            {unread.slice(0, 5).map((e) => (
              <li key={e.id} className="px-4 py-2.5">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.body} · {formatDateTime(e.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {positions.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Portföy boş"
          description="Bir varlık ekle: miktarı ve maliyeti sen girersin, güncel fiyat otomatik çekilir."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Varlık</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Fiyat</TableHead>
                <TableHead className="text-right">24s</TableHead>
                <TableHead className="text-right">Değer</TableHead>
                <TableHead className="hidden sm:table-cell text-right">K/Z</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.symbol}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.name ?? p.coinId}</p>
                  </TableCell>
                  <TableCell className="text-right tabular text-sm">{p.amount}</TableCell>
                  <TableCell className="text-right tabular text-sm">
                    {p.quote ? `$${p.quote.priceUsd.toLocaleString("tr-TR", { maximumFractionDigits: p.quote.priceUsd < 1 ? 6 : 2 })}` : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular text-sm",
                      (p.quote?.change24h ?? 0) >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {p.quote ? `%${p.quote.change24h.toFixed(1)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular font-medium">{fmt(p.valueBase)}</TableCell>
                  <TableCell
                    className={cn(
                      "hidden sm:table-cell text-right tabular text-sm",
                      p.pnlBase >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {p.costBase > 0 ? (
                      <>
                        {fmt(p.pnlBase)}
                        <span className="block text-xs">%{(p.pnlPercent ?? 0).toFixed(1)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditHolding(p)}>
                          <Pencil className="size-4" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDelHolding(p)}>
                          <Trash2 className="size-4" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-medium">Fiyat uyarıları</h2>
              <p className="text-xs text-muted-foreground">Kural tabanlı — tahmin değil</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddRule(true)}>
              <Plus className="size-4" /> Kural
            </Button>
          </div>
          {rules.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Henüz kural yok. Örnek: &quot;BTC 70.000 doların altına inerse haber ver&quot;.
            </p>
          ) : (
            <ul className="divide-y">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {r.symbol} · {ALERT_KINDS.find((k) => k.value === r.kind)?.label} {r.threshold}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.lastFiredAt ? `son tetik ${formatDateTime(r.lastFiredAt)}` : "henüz tetiklenmedi"}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    title={r.enabled === 1 ? "Devre dışı bırak" : "Etkinleştir"}
                    onClick={() => start(() => toggleAlertRule(r.id, r.enabled !== 1))}
                  >
                    {r.enabled === 1 ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      start(async () => {
                        await deleteAlertRule(r.id)
                        toast.success("Kural silindi")
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-medium">Cüzdanlar</h2>
              <p className="text-xs text-muted-foreground">Sadece okuma — private key hiçbir zaman istenmez</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={syncing || wallets.length === 0}
              onClick={() =>
                start(async () => {
                  setSyncing(true)
                  try {
                    const result = await syncWallets()
                    if (result.errors.length > 0) {
                      toast.warning(result.updated + " güncellendi, " + result.errors.length + " hata")
                    } else {
                      toast.success(result.updated + " bakiye güncellendi")
                    }
                  } finally {
                    setSyncing(false)
                  }
                })
              }
            >
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Bakiyeleri çek
            </Button>
          </div>
          {wallets.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Cüzdan eklenmedi.</p>
          ) : (
            <ul className="divide-y">
              {wallets.map((w) => (
                <li key={w.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Wallet className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{w.label}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{w.address}</p>
                    </div>
                    {w.totalBase > 0 && <span className="shrink-0 text-sm font-medium tabular">{fmt(w.totalBase)}</span>}
                    {EXPLORERS[w.chain] && (
                      <a
                        href={EXPLORERS[w.chain] + w.address}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        title="Explorer"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      title="Token ekle"
                      onClick={() => setTokenFor(w.id)}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDelWallet(w)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {w.balances.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-7">
                      {w.balances.map((b) => (
                        <li key={b.id} className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{b.symbol}</span>
                          <span className="tabular text-muted-foreground">{b.amount}</span>
                          {b.valueBase > 0 && (
                            <span className="tabular text-muted-foreground">· {fmt(b.valueBase)}</span>
                          )}
                          {b.kind === "token" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                start(async () => {
                                  await removeWalletBalance(b.id)
                                  toast.success("Kaldırıldı")
                                })
                              }
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        Uyarılar kural tabanlıdır: girdiğin eşiğe ulaşıldığında haber verir, fiyatın ne yapacağını tahmin
        etmez. Kontroller sunucuda saatlik çalışır; 6 saat içinde aynı kural tekrar tetiklenmez. 1 USD ={" "}
        {usdRate.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ üzerinden çevriliyor.
      </p>

      <HoldingDialog wallets={wallets} open={addHolding} onOpenChange={setAddHolding} />
      {editHolding && (
        <HoldingDialog
          key={editHolding.id}
          holding={editHolding}
          wallets={wallets}
          open
          onOpenChange={(o) => !o && setEditHolding(null)}
        />
      )}

      <FormDialog
        open={addWallet}
        onOpenChange={setAddWallet}
        title="Cüzdan ekle"
        description="Yalnızca public adres. Private key veya seed asla girilmemeli."
        action={saveWallet}
        successMessage="Cüzdan eklendi"
        width="sm"
      >
        <div className="space-y-4">
          <TextField name="label" label="Etiket" required placeholder="Trust Wallet — ana" />
          <SelectField name="chain" label="Zincir" options={CHAINS} defaultValue="ethereum" />
          <TextField name="address" label="Public adres" required placeholder="0x…" />
          <AreaField name="notes" label="Not" rows={2} />
        </div>
      </FormDialog>

      <FormDialog
        open={addRule}
        onOpenChange={setAddRule}
        title="Uyarı kuralı"
        description="Eşiğe ulaşıldığında bildirim oluşturulur."
        action={saveAlertRule}
        successMessage="Kural eklendi"
        width="sm"
      >
        <input type="hidden" name="enabled" value="on" />
        <div className="space-y-4">
          <FormGrid>
            <CoinPicker />
          </FormGrid>
          <SelectField name="kind" label="Koşul" options={ALERT_KINDS} defaultValue="price_below" />
          <TextField name="threshold" label="Eşik" required placeholder="70000" />
          <TextField name="note" label="Not" placeholder="Alım bölgesi" />
        </div>
      </FormDialog>

      <Dialog open={tokenFor !== null} onOpenChange={(o) => !o && setTokenFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Token ekle</DialogTitle>
            <DialogDescription>
              Takip etmek istediğin token kontrat adresini yapıştır. Sembol ve ondalık bilgisi zincirden okunur.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tokenContract}
            onChange={(e) => setTokenContract(e.target.value)}
            placeholder="0x…"
            className="font-mono text-xs"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setTokenFor(null)}>
              Vazgeç
            </Button>
            <Button
              disabled={!tokenContract.trim() || tokenFor === null}
              onClick={() =>
                start(async () => {
                  if (!tokenFor) return
                  const result = await addWalletToken(tokenFor, tokenContract)
                  if (result.error) {
                    toast.error(result.error)
                    return
                  }
                  toast.success(result.symbol + " eklendi, bakiyeleri çekmeyi unutma")
                  setTokenFor(null)
                  setTokenContract("")
                })
              }
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={delHolding !== null}
        onOpenChange={(o) => !o && setDelHolding(null)}
        onConfirm={() => (delHolding ? deleteHolding(delHolding.id) : Promise.resolve())}
        title="Varlık silinsin mi?"
        description={delHolding?.symbol ?? ""}
      />
      <ConfirmDialog
        open={delWallet !== null}
        onOpenChange={(o) => !o && setDelWallet(null)}
        onConfirm={() => (delWallet ? deleteWallet(delWallet.id) : Promise.resolve())}
        title="Cüzdan silinsin mi?"
        description={delWallet?.label ?? ""}
      />
    </div>
  )
}
