"use client"

import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/lib/actions/auth"
import type { ActionState } from "@/lib/actions/helpers"

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(login, null)
  const needCode = state?.stage === "need-code"
  const codeRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (needCode) codeRef.current?.focus()
  }, [needCode])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
          Kullanıcı adı
        </Label>
        <Input id="username" name="username" autoComplete="username" autoFocus={!needCode} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
          Parola
        </Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {needCode && (
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor="code" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Doğrulama kodu
          </Label>
          <Input
            ref={codeRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="tabular tracking-[0.3em]"
          />
          <p className="text-[11px] text-muted-foreground">
            Doğrulayıcı uygulamandaki 6 haneli kod ya da kurtarma kodlarından biri.
          </p>
        </div>
      )}

      {state?.error && (
        <p className="rounded-md border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full gap-1.5" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
        {needCode ? "Doğrula ve gir" : "Giriş yap"}
      </Button>
    </form>
  )
}
