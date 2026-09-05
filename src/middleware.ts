import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session"

const LOGIN_PATH = "/giris"
const isDev = process.env.NODE_ENV !== "production"

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.coingecko.com https://api.frankfurter.app https://open.er-api.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ].join("; ")
}

function withSecurity(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const proceed = () => withSecurity(NextResponse.next({ request: { headers: requestHeaders } }), csp)

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === LOGIN_PATH) {
    if (session) return withSecurity(NextResponse.redirect(new URL("/", request.url)), csp)
    return proceed()
  }

  if (session) return proceed()

  const url = new URL(LOGIN_PATH, request.url)
  if (pathname !== "/") url.searchParams.set("devam", `${pathname}${search}`)
  return withSecurity(NextResponse.redirect(url), csp)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|saglik|api/cron|api/takvim|api/webhook|sw.js|manifest.webmanifest|icon-|apple-touch-icon).*)",
  ],
}
