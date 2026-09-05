"use client"

import { MoreHorizontal, NotebookPen, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { ConfirmDialog } from "@/components/forms/form-dialog"
import { NoteDialog } from "@/components/forms/note-dialog"
import type { Lookup } from "@/components/forms/project-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { Markdown } from "@/components/shared/markdown"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Note } from "@/db/schema"
import { useNewParam } from "@/hooks/use-new-param"
import { deleteNote, togglePin } from "@/lib/actions/notes"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export type NoteRow = Note & { projectName: string | null }

function tagsOf(note: Note) {
  return (note.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

function NoteCard({ note, projects }: { note: NoteRow; projects: Lookup[] }) {
  const [edit, setEdit] = React.useState(false)
  const [view, setView] = React.useState(false)
  const [del, setDel] = React.useState(false)
  const [, start] = React.useTransition()
  const tags = tagsOf(note)

  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20",
        note.pinned === 1 && "border-amber-500/30 bg-amber-500/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => setEdit(true)} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium">{note.title}</p>
        </button>
        <div className="flex shrink-0 items-center">
          {note.pinned === 1 && <Pin className="size-3.5 text-amber-600 dark:text-amber-400" />}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">İşlemler</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEdit(true)}>
                <Pencil className="size-4" /> Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => start(() => togglePin(note.id, note.pinned !== 1))}>
                {note.pinned === 1 ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                {note.pinned === 1 ? "Sabitlemeyi kaldır" : "Sabitle"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
                <Trash2 className="size-4" /> Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <button type="button" onClick={() => setView(true)} className="mt-2 flex-1 overflow-hidden text-left">
        <div className="line-clamp-6 text-muted-foreground [&_*]:text-muted-foreground">
          {note.content ? <Markdown source={note.content} /> : <p className="text-sm">Boş not</p>}
        </div>
      </button>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="truncate">{note.projectName ?? "Genel"}</span>
        <span className="shrink-0">{formatDateTime(note.updatedAt)}</span>
      </div>

      <NoteDialog note={note} projects={projects} open={edit} onOpenChange={setEdit} />
      <Dialog open={view} onOpenChange={setView}>
        <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{note.title}</DialogTitle>
          </DialogHeader>
          <Markdown source={note.content || "_Boş not_"} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => { setView(false); setEdit(true) }}>
              Düzenle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        onConfirm={() => deleteNote(note.id)}
        title="Not silinsin mi?"
        description={note.title}
      />
    </div>
  )
}

export function NotesClient({ notes, projects }: { notes: NoteRow[]; projects: Lookup[] }) {
  const [newOpen, setNewOpen] = useNewParam("note")
  const [q, setQ] = React.useState("")
  const [tag, setTag] = React.useState<string | null>(null)

  const allTags = React.useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const t of tagsOf(n)) set.add(t)
    return [...set].sort()
  }, [notes])

  const filtered = notes.filter((n) => {
    if (tag && !tagsOf(n).includes(tag)) return false
    if (q && !`${n.title} ${n.content} ${n.tags ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notlar"
        description={`${notes.length} not · ${allTags.length} etiket`}
        actions={
          <NoteDialog
            projects={projects}
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Yeni not
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Notlarda ara…"
          className="h-9 sm:max-w-xs"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setTag(null)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                tag === null ? "bg-secondary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tümü
            </button>
            {allTags.slice(0, 12).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t === tag ? null : t)}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                  tag === t ? "bg-secondary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={notes.length === 0 ? "Henüz not yok" : "Eşleşen not bulunamadı"}
          description={
            notes.length === 0
              ? "Toplantı notları, kod parçacıkları veya fikirlerinizi buraya kaydedin; etiketleyip projelere bağlayabilirsiniz."
              : "Arama veya etiketi değiştirmeyi deneyin."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((n) => (
            <NoteCard key={n.id} note={n} projects={projects} />
          ))}
        </div>
      )}
    </div>
  )
}
