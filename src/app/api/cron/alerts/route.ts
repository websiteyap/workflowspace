import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { cronToken, runAlertCheck } from "@/lib/alerts"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const expected = cronToken()
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("unauthorized", { status: 401 })
  }

  const result = await runAlertCheck()
  return NextResponse.json(result)
}
