"use client"

import { Loader2, LockKeyhole } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/lib/actions/auth"
import type { ActionState } from "@/lib/actions/helpers"

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(login, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
          Kullanıcı adı
        </Label>
        <Input id="username" name="username" autoComplete="username" autoFocus required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
          Parola
        </Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state?.error && (
        <p className="rounded-md border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full gap-1.5" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
        Giriş yap
      </Button>
    </form>
  )
}
