import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { clientsWithStats } from "@/lib/queries"
import { ClientsClient } from "./clients-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Müşteriler" }

export default async function ClientsPage() {
  const clients = await clientsWithStats()
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ClientsClient clients={clients} />
    </Suspense>
  )
}
