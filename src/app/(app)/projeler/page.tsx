import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { lookups, projectsWithClient } from "@/lib/queries"
import { ProjectsClient } from "./projects-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Projeler" }

export default async function ProjectsPage() {
  const [projects, look] = await Promise.all([projectsWithClient(), lookups()])
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProjectsClient projects={projects} clients={look.clients} />
    </Suspense>
  )
}
