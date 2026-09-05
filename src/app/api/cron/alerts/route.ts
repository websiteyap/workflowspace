import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { cronToken } from "@/lib/alerts"
import { captureError } from "@/lib/observability"
import { runTick } from "@/lib/tick"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const expected = cronToken()
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("unauthorized", { status: 401 })
  }

  try {
    const result = await runTick()
    return NextResponse.json(result)
  } catch (error) {
    await captureError(error, "cron-tick")
    return NextResponse.json({ error: "tick failed" }, { status: 500 })
  }
}
