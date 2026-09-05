import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { lookups, paymentsList } from "@/lib/queries"
import { PaymentsClient } from "./payments-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ödemeler" }

export default async function PaymentsPage() {
  const [payments, look] = await Promise.all([paymentsList(), lookups()])
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <PaymentsClient payments={payments} clients={look.clients} projects={look.projects} />
    </Suspense>
  )
}
