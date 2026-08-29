import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/safe-redirect'

export async function GET(request: Request) {
  const { searchParams, origin: rawOrigin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  // Next's standalone server (see Dockerfile) reports request.url using its
  // own bind address (HOSTNAME=0.0.0.0, PORT=3000), not the host the client
  // actually requested, when run behind the nginx reverse proxy on staging.
  // nginx forwards the real Host and X-Forwarded-Proto — prefer those.
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const origin = forwardedHost ? `${forwardedProto ?? 'http'}://${forwardedHost}` : rawOrigin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`)
}
