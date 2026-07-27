import { NextRequest, NextResponse } from 'next/server'

export const GOOGLE_CALENDAR_EMAIL = 'miqueas.elias@allaria.com.ar'
export const ACCESS_COOKIE = 'linkboard_google_access'
export const REFRESH_COOKIE = 'linkboard_google_refresh'

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar is not configured')
  }

  return { clientId, clientSecret }
}

export function callbackUrl(req: NextRequest) {
  return `${req.nextUrl.origin}/api/google-calendar/callback`
}

export function setTokenCookies(
  response: NextResponse,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number },
) {
  const secure = process.env.NODE_ENV === 'production'
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expires_in || 3600,
  })
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    })
  }
}

export async function getAccessToken(req: NextRequest) {
  const existing = req.cookies.get(ACCESS_COOKIE)?.value
  if (existing) return { accessToken: existing }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  if (!refreshToken) return null

  const { clientId, clientSecret } = googleConfig()
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })
  if (!tokenResponse.ok) return null

  const tokens = await tokenResponse.json()
  return {
    accessToken: tokens.access_token as string,
    refreshedTokens: tokens as {
      access_token: string
      expires_in?: number
    },
  }
}

export async function googleProfile(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json() as Promise<{ email?: string; name?: string; picture?: string }>
}

export function clearGoogleCookies(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, '', { httpOnly: true, path: '/', maxAge: 0 })
  }
}
