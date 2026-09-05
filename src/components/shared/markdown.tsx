import { cn } from "@/lib/utils"

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; lang: string | null; lines: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "rule" }

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (line.trim() === "") {
      index += 1
      continue
    }

    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1] || null
      const body: string[] = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push({ type: "code", lang, lines: body })
      continue
    }

    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "rule" })
      index += 1
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] })
      index += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ""))
        index += 1
      }
      blocks.push({ type: "quote", lines: body })
      continue
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*([-*+]|\d+\.)\s+/, ""))
        index += 1
      }
      blocks.push({ type: "list", ordered, items })
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+\.)\s)/.test(lines[index])
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") })
  }

  return blocks
}

function Inline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+)/g
  let cursor = 0
  let match: RegExpExecArray | null
  let key = 0

  match = pattern.exec(text)
  while (match !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]

    if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"))
      const href = match[5]
      nodes.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-foreground underline underline-offset-2 hover:no-underline"
        >
          {label}
        </a>,
      )
    } else if (token.startsWith("http")) {
      nodes.push(
        <a
          key={key++}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-foreground underline underline-offset-2 hover:no-underline"
        >
          {token}
        </a>,
      )
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      )
    }

    cursor = match.index + token.length
    match = pattern.exec(text)
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return <>{nodes}</>
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parse(source)

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const size =
              block.level === 1 ? "text-base font-semibold" : block.level === 2 ? "text-sm font-semibold" : "text-sm font-medium"
            return (
              <p key={i} className={cn(size, "text-foreground")}>
                <Inline text={block.text} />
              </p>
            )
          }
          case "list":
            return block.ordered ? (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            )
          case "code":
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-xs leading-relaxed scrollbar-thin"
              >
                <code>{block.lines.join("\n")}</code>
              </pre>
            )
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 pl-3 text-muted-foreground">
                <Inline text={block.lines.join("\n")} />
              </blockquote>
            )
          case "rule":
            return <hr key={i} className="border-border" />
          default:
            return (
              <p key={i} className="whitespace-pre-wrap">
                <Inline text={block.text} />
              </p>
            )
        }
      })}
    </div>
  )
}
