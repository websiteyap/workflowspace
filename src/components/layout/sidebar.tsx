"use client"

import { LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/actions/auth"
import { NAV } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
      {NAV.map((group, gi) => (
        <div key={group.group || `g${gi}`} className="space-y-1">
          {group.group && (
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {group.group}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-4 shrink-0", active ? "opacity-100" : "opacity-70")} />
                <span className="truncate">{item.label}</span>
                {item.shortcut && (
                  <kbd className="ml-auto hidden rounded border border-border/70 bg-muted px-1.5 font-mono text-[10px] text-muted-foreground/80 group-hover:inline-block">
                    {item.shortcut}
                  </kbd>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <Logo />
        <div className="leading-none">
          <p className="text-sm font-semibold tracking-tight">Source</p>
        </div>
      </div>
      <SidebarNav />
      <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            Çıkış
          </Button>
        </form>
        <ThemeToggle />
      </div>
    </aside>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-6 items-center justify-center rounded-[7px] bg-foreground text-background",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 16-4-4 4-4" />
        <path d="m16 8 4 4-4 4" />
      </svg>
    </span>
  )
}
