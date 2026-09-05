import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { moneyContext } from "@/lib/display-currency"
import { lookups, paymentsList } from "@/lib/queries"
import { PaymentsClient } from "./payments-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ödemeler" }

export default async function PaymentsPage() {
  const [payments, look, money] = await Promise.all([paymentsList(), lookups(), moneyContext()])
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <PaymentsClient
        payments={payments}
        projects={look.projects}
        display={money.display}
        rates={money.rates}
      />
    </Suspense>
  )
}
