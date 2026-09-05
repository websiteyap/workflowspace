"use client"

import { Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { FLAT_NAV } from "@/lib/nav"

export type SearchEntry = { id: string; label: string; sub?: string; href: string; group: string }

export function CommandPalette({
  entries,
  open,
  onOpenChange,
}: {
  entries: SearchEntry[]
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()

  React.useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const n = el as HTMLElement | null
      return !!n && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
        return
      }
      if (open || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const item = FLAT_NAV.find((n) => n.shortcut === e.key)
      if (item) {
        e.preventDefault()
        router.push(item.href)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onOpenChange, router])

  const go = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, SearchEntry[]>()
    for (const e of entries) {
      const list = map.get(e.group) ?? []
      list.push(e)
      map.set(e.group, list)
    }
    return [...map.entries()]
  }, [entries])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Müşteri, proje, not ara veya sayfaya git…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
        <CommandGroup heading="Sayfalar">
          {FLAT_NAV.map((item) => (
            <CommandItem key={item.href} value={`sayfa ${item.label} ${item.description}`} onSelect={() => go(item.href)}>
              <item.icon className="size-4 text-muted-foreground" />
              <span>{item.label}</span>
              <span className="ml-2 truncate text-xs text-muted-foreground">{item.description}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        {grouped.map(([group, items]) => (
          <React.Fragment key={group}>
            <CommandSeparator />
            <CommandGroup heading={group}>
              {items.slice(0, 40).map((e) => (
                <CommandItem key={e.id} value={`${group} ${e.label} ${e.sub ?? ""}`} onSelect={() => go(e.href)}>
                  <Search className="size-4 text-muted-foreground" />
                  <span className="truncate">{e.label}</span>
                  {e.sub && <span className="ml-auto truncate text-xs text-muted-foreground">{e.sub}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Hızlı işlem">
          <CommandItem value="yeni gorev ekle" onSelect={() => go("/gorevler?new=task")}>
            <Plus className="size-4 text-muted-foreground" /> Yeni görev
          </CommandItem>
          <CommandItem value="yeni proje ekle" onSelect={() => go("/projeler?new=project")}>
            <Plus className="size-4 text-muted-foreground" /> Yeni iş / proje
          </CommandItem>
          <CommandItem value="yeni hedef dilek ekle" onSelect={() => go("/hedefler?new=goal")}>
            <Plus className="size-4 text-muted-foreground" /> Yeni hedef
          </CommandItem>
          <CommandItem value="yeni odeme ekle" onSelect={() => go("/odemeler?new=payment")}>
            <Plus className="size-4 text-muted-foreground" /> Yeni ödeme
          </CommandItem>
          <CommandItem value="yeni gelir gider ekle" onSelect={() => go("/finans?new=transaction")}>
            <Plus className="size-4 text-muted-foreground" /> Yeni gelir / gider
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
