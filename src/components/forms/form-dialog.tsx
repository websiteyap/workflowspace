"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ActionState } from "@/lib/actions/helpers"
import { cn } from "@/lib/utils"

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>

export function FormDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Kaydet",
  successMessage = "Kaydedildi",
  open: controlledOpen,
  onOpenChange,
  width = "md",
}: {
  trigger?: React.ReactNode
  title: string
  description?: string
  action: Action
  children: React.ReactNode
  submitLabel?: string
  successMessage?: string
  open?: boolean
  onOpenChange?: (o: boolean) => void
  width?: "sm" | "md" | "lg"
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false)
  const open = controlledOpen ?? uncontrolled
  const setOpen = onOpenChange ?? setUncontrolled

  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(action, null)
  const handled = React.useRef<ActionState>(null)

  React.useEffect(() => {
    if (!state || state === handled.current) return
    handled.current = state
    if (state.ok) {
      toast.success(successMessage)
      setOpen(false)
    } else if (state.error) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto scrollbar-thin",
          width === "sm" && "sm:max-w-md",
          width === "md" && "sm:max-w-2xl",
          width === "lg" && "sm:max-w-3xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={formAction} className="space-y-5" key={open ? "open" : "closed"}>
          {children}
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Bu kaydı sil?",
  description = "Bu işlem geri alınamaz.",
  confirmLabel = "Sil",
  successMessage = "Silindi",
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onConfirm: () => Promise<void> | void
  title?: string
  description?: string
  confirmLabel?: string
  successMessage?: string
}) {
  const [pending, start] = React.useTransition()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await onConfirm()
                onOpenChange(false)
                toast.success(successMessage)
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
