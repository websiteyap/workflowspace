import { Suspense } from "react"
import { Logo } from "@/components/layout/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { LoginForm } from "./login-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Giriş" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ devam?: string }>
}) {
  const { devam } = await searchParams
  const next = devam && devam.startsWith("/") && !devam.startsWith("//") ? devam : "/"

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-9 rounded-[10px]" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Source</h1>
            <p className="text-sm text-muted-foreground">Devam etmek için giriş yapın</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <LoginForm next={next} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
