import { NextRequest, NextResponse } from 'next/server'
import {
  callbackUrl,
  clearGoogleCookies,
  GOOGLE_CALENDAR_EMAIL,
  googleConfig,
  googleProfile,
  setTokenCookies,
} from '@/lib/google-calendar'

function dashboard(req: NextRequest, key: string, value: string) {
  const url = new URL('/dashboard.html', req.url)
  url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const expectedState = req.cookies.get('linkboard_google_state')?.value
  if (!code || !state || state !== expectedState) {
    return dashboard(req, 'calendar_error', 'invalid_state')
  }

  try {
    const { clientId, clientSecret } = googleConfig()
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl(req),
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    })
    if (!tokenResponse.ok) throw new Error('Token exchange failed')
    const tokens = await tokenResponse.json()
    const profile = await googleProfile(tokens.access_token)
    if (profile?.email?.toLowerCase() !== GOOGLE_CALENDAR_EMAIL) {
      const response = dashboard(req, 'calendar_error', 'wrong_account')
      clearGoogleCookies(response)
      return response
    }

    const response = dashboard(req, 'calendar_connected', '1')
    setTokenCookies(response, tokens)
    response.cookies.set('linkboard_google_state', '', { path: '/', maxAge: 0 })
    return response
  } catch {
    return dashboard(req, 'calendar_error', 'oauth_failed')
  }
}
