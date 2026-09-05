import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { moneyContext } from "@/lib/display-currency"
import { monthRange } from "@/lib/format"
import { financeSummary, goalsList, reservedTotal } from "@/lib/queries"
import { GoalsClient } from "./goals-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Hedefler" }

export default async function GoalsPage() {
  const year = new Date().getFullYear()
  const [goals, money, reserved, summary] = await Promise.all([
    goalsList(),
    moneyContext(),
    reservedTotal(),
    financeSummary(`${year}-01-01`, monthRange(0).end),
  ])

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <GoalsClient
        goals={goals}
        display={money.display}
        rates={money.rates}
        available={summary.net - reserved}
      />
    </Suspense>
  )
}
