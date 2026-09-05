"use client"

import { RefreshCw, TriangleAlert } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-20 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <TriangleAlert className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">Bir şeyler ters gitti</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Bu sayfa yüklenirken bir hata oluştu. Tekrar deneyebilir ya da veritabanı dosyasının
          (<code className="font-mono">data/source.db</code>) erişilebilir olduğunu kontrol edebilirsiniz.
        </p>
        {error.digest && <p className="pt-1 font-mono text-xs text-muted-foreground/70">#{error.digest}</p>}
      </div>
      <Button onClick={reset} variant="outline" size="sm" className="gap-1.5">
        <RefreshCw className="size-4" /> Tekrar dene
      </Button>
    </div>
  )
}
