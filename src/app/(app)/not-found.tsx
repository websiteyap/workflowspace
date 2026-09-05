import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-20 text-center">
      <p className="font-mono text-4xl font-semibold tracking-tight text-muted-foreground/40">404</p>
      <div className="space-y-1">
        <p className="font-medium">Kayıt bulunamadı</p>
        <p className="text-sm text-muted-foreground">Aradığınız sayfa taşınmış ya da kayıt silinmiş olabilir.</p>
      </div>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href="/">
          <ArrowLeft className="size-4" /> Panele dön
        </Link>
      </Button>
    </div>
  )
}
