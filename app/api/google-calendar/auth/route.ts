import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { callbackUrl, googleConfig } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  try {
    const { clientId } = googleConfig()
    const state = randomBytes(24).toString('hex')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl(req),
      response_type: 'code',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.readonly',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
      state,
      login_hint: 'miqueas.elias@allaria.com.ar',
    })
    const response = NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    )
    response.cookies.set('linkboard_google_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
    return response
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard.html?calendar_error=not_configured', req.url),
    )
  }
}
