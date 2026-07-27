import { NextRequest, NextResponse } from 'next/server'
import {
  clearGoogleCookies,
  getAccessToken,
  GOOGLE_CALENDAR_EMAIL,
  googleProfile,
  setTokenCookies,
} from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  try {
    const token = await getAccessToken(req)
    if (!token) return NextResponse.json({ connected: false })
    const profile = await googleProfile(token.accessToken)
    const connected = profile?.email?.toLowerCase() === GOOGLE_CALENDAR_EMAIL
    const response = NextResponse.json({
      connected,
      email: connected ? profile?.email : undefined,
      name: connected ? profile?.name : undefined,
      configured: true,
    })
    if (token.refreshedTokens) setTokenCookies(response, token.refreshedTokens)
    if (!connected) clearGoogleCookies(response)
    return response
  } catch (error) {
    return NextResponse.json({
      connected: false,
      configured: !String(error).includes('not configured'),
    })
  }
}
