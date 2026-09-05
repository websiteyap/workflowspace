import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session"

const LOGIN_PATH = "/giris"

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === LOGIN_PATH) {
    if (session) return NextResponse.redirect(new URL("/", request.url))
    return NextResponse.next()
  }

  if (session) return NextResponse.next()

  const url = new URL(LOGIN_PATH, request.url)
  if (pathname !== "/") url.searchParams.set("devam", `${pathname}${search}`)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|saglik|api/cron|api/takvim|sw.js|manifest.webmanifest|icon-|apple-touch-icon).*)",
  ],
}
