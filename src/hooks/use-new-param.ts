"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

export function useNewParam(key: string) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (params.get("new") === key) setOpen(true)
  }, [params, key])

  const change = React.useCallback(
    (o: boolean) => {
      setOpen(o)
      if (!o && params.get("new") === key) router.replace(pathname, { scroll: false })
    },
    [params, key, router, pathname],
  )

  return [open, change] as const
}
