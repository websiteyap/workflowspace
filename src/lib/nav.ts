import {
  BarChart3,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  description: string
  shortcut?: string
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Genel",
    items: [
      { href: "/", label: "Panel", icon: LayoutDashboard, description: "Günün özeti", shortcut: "1" },
      { href: "/gorevler", label: "Görevler", icon: ListChecks, description: "Günlük hedefler ve yapılacaklar", shortcut: "2" },
      { href: "/notlar", label: "Notlar", icon: NotebookPen, description: "Fikirler, toplantı notları, snippet'ler", shortcut: "3" },
    ],
  },
  {
    group: "İş",
    items: [
      {
        href: "/projeler",
        label: "İşler",
        icon: FolderKanban,
        description: "Projeler, müşteriler, döngüsel ücretler",
        shortcut: "4",
      },
    ],
  },
  {
    group: "Finans",
    items: [
      { href: "/odemeler", label: "Ödemeler", icon: CreditCard, description: "Tahsilatlar ve vade takibi", shortcut: "5" },
      { href: "/finans", label: "Gelir / Gider", icon: BarChart3, description: "Nakit akışı ve raporlar", shortcut: "6" },
    ],
  },
  {
    group: "",
    items: [{ href: "/ayarlar", label: "Ayarlar", icon: Settings, description: "Tercihler ve veri" }],
  },
]

export const FLAT_NAV = NAV.flatMap((g) => g.items)
