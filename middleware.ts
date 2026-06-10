import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession, isAuthConfigured } from '@/lib/auth'

// Routes publiques (jamais protégées).
const PUBLIC_PREFIXES = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request })
  }

  // Si l'auth n'est pas configurée, on laisse passer mais on le signale
  // (évite de verrouiller le cockpit avant que DASH_ACCESS_PASSWORD soit posé).
  if (!isAuthConfigured()) {
    console.warn('[auth] DASH_ACCESS_PASSWORD non défini — cockpit NON protégé')
    return NextResponse.next({ request })
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (await verifySession(token)) {
    return NextResponse.next({ request })
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('from', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // Protège tout sauf les assets statiques et les routes API
  // (les routes API/cron ont leur propre auth via CRON_SECRET / Bearer).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
