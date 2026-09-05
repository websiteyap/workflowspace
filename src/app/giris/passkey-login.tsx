"use client"

import { startAuthentication } from "@simplewebauthn/browser"
import { Fingerprint, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { beginPasskeyLogin, finishPasskeyLogin } from "@/lib/actions/passkeys"

export function PasskeyLogin({ next }: { next: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [supported, setSupported] = React.useState(true)

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && Boolean(window.PublicKeyCredential))
  }, [])

  if (!supported) return null

  const login = async () => {
    setBusy(true)
    try {
      const start = await beginPasskeyLogin()
      if (start.error || !start.options) {
        toast.error(start.error ?? "Passkey başlatılamadı")
        return
      }
      const response = await startAuthentication({ optionsJSON: start.options })
      const result = await finishPasskeyLogin(response)
      if (result.error) {
        toast.error(result.error)
        return
      }
      router.replace(next)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "İşlem iptal edildi"
      if (!message.toLowerCase().includes("abort")) toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">veya</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full gap-1.5" onClick={login} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
        Passkey ile gir
      </Button>
    </div>
  )
}
