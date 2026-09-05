import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { moneyContext } from "@/lib/display-currency"
import { projectsOverview } from "@/lib/queries"
import { ProjectsClient } from "./projects-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "İşler" }

export default async function ProjectsPage() {
  const [projects, money] = await Promise.all([projectsOverview(), moneyContext()])
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProjectsClient projects={projects} display={money.display} rates={money.rates} />
    </Suspense>
  )
}
