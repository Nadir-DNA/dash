import { initClient } from 'trailbase'
import { NextResponse, type NextRequest } from 'next/server'

// Temporarily empty during design migration — restore after auth is set up
const PROTECTED_PREFIXES: string[] = []

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))

  if (!isProtected) {
    return NextResponse.next({ request })
  }

  const authToken = request.cookies.get('auth_token')?.value

  if (!authToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  try {
    const client = initClient(process.env.NEXT_PUBLIC_TRAILBASE_URL!, {
      tokens: {
        auth_token: authToken,
        refresh_token: request.cookies.get('refresh_token')?.value ?? null,
        csrf_token: null,
      },
    })

    const user = client.user()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    response.cookies.delete('auth_token')
    response.cookies.delete('refresh_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
