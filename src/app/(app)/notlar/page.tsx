import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { lookups, notesList } from "@/lib/queries"
import { NotesClient } from "./notes-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Notlar" }

export default async function NotesPage() {
  const [notes, look] = await Promise.all([notesList(), lookups()])
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NotesClient notes={notes} projects={look.projects} />
    </Suspense>
  )
}
