import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { activeSession } from "@/lib/auth/store"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await activeSession()
  if (!session) return new NextResponse("unauthorized", { status: 401 })

  const data = new URL(request.url).searchParams.get("data")
  if (!data || data.length > 512) return new NextResponse("bad request", { status: 400 })

  const dataUrl = await QRCode.toDataURL(data, { margin: 1, width: 336, errorCorrectionLevel: "M" })
  return new NextResponse(dataUrl, {
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  })
}
