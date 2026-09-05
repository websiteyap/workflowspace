import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { lookups, tasksBoard } from "@/lib/queries"
import { TasksClient } from "./tasks-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Görevler" }

export default async function TasksPage() {
  const [tasks, look] = await Promise.all([tasksBoard(), lookups()])
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TasksClient tasks={tasks} projects={look.projects} />
    </Suspense>
  )
}
