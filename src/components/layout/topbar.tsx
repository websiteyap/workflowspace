"use client"

import { ChevronRight, Menu, Plus, Search } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { NotificationBell } from "@/components/reminders/notification-settings"
import type { RateMap } from "@/lib/format"
import { FLAT_NAV } from "@/lib/nav"
import { CurrencySwitch } from "./currency-switch"
import { CommandPalette, type SearchEntry } from "./command-palette"
import { Logo, SidebarNav } from "./sidebar"
import { ThemeToggle } from "./theme-toggle"

const QUICK = [
  { label: "İş / Proje", href: "/projeler?new=project" },
  { label: "Görev", href: "/gorevler?new=task" },
  { label: "Not", href: "/notlar?new=note" },
  { label: "Hedef", href: "/hedefler?new=goal" },
  { label: "Ödeme", href: "/odemeler?new=payment" },
  { label: "Gelir / Gider", href: "/finans?new=transaction" },
]

export function Topbar({
  entries,
  display,
  rates,
}: {
  entries: SearchEntry[]
  display: string
  rates: RateMap
}) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [menu, setMenu] = React.useState(false)

  const current = FLAT_NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))
  const isDetail = pathname.split("/").filter(Boolean).length > 1

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="size-4" />
            <span className="sr-only">Menü</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="flex h-14 items-center gap-2.5 border-b px-5 text-sm font-semibold">
            <Logo /> Source
          </SheetTitle>
          <SidebarNav onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>

      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link href={current?.href ?? "/"} className="truncate font-medium hover:text-foreground">
          {current?.label ?? "Panel"}
        </Link>
        {isDetail && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate text-muted-foreground">Detay</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <CurrencySwitch display={display} rates={rates} />
        <NotificationBell />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:w-56"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Ara…</span>
          <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Yeni</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {QUICK.map((q) => (
              <DropdownMenuItem key={q.href} asChild>
                <Link href={q.href}>{q.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="lg:hidden">
          <ThemeToggle />
        </div>
      </div>

      <CommandPalette entries={entries} open={open} onOpenChange={setOpen} />
    </header>
  )
}
