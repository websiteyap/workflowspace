"use client"

import { Loader2, Plus } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { quickTask } from "@/lib/actions/tasks"
import type { ActionState } from "@/lib/actions/helpers"

export function QuickTask({
  dueDate,
  projectId,
  placeholder = "Yeni görev ekle…",
}: {
  dueDate?: string
  projectId?: string
  placeholder?: string
}) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(quickTask, null)
  const seen = React.useRef<ActionState>(null)

  React.useEffect(() => {
    if (!state || state === seen.current) return
    seen.current = state
    if (state.ok) formRef.current?.reset()
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      {dueDate && <input type="hidden" name="dueDate" value={dueDate} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <Input name="title" placeholder={placeholder} autoComplete="off" required className="h-9" />
      <Button type="submit" size="icon" variant="secondary" className="size-9 shrink-0" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        <span className="sr-only">Ekle</span>
      </Button>
    </form>
  )
}
