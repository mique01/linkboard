import { NextRequest, NextResponse } from 'next/server'
import {
  getAccessToken,
  GOOGLE_CALENDAR_EMAIL,
  googleProfile,
  setTokenCookies,
} from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  try {
    const token = await getAccessToken(req)
    if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })
    const profile = await googleProfile(token.accessToken)
    if (profile?.email?.toLowerCase() !== GOOGLE_CALENDAR_EMAIL) {
      return NextResponse.json({ error: 'Wrong Google account' }, { status: 403 })
    }

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      timeZone: 'America/Argentina/Buenos_Aires',
      timeMin: from || new Date().toISOString(),
      timeMax: to || new Date(Date.now() + 31 * 86400000).toISOString(),
    })
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: { authorization: `Bearer ${token.accessToken}` },
        cache: 'no-store',
      },
    )
    if (!calendarResponse.ok) {
      return NextResponse.json({ error: 'Calendar request failed' }, { status: 502 })
    }
    const data = await calendarResponse.json()
    const response = NextResponse.json({
      events: (data.items || []).map((event: Record<string, any>) => ({
        id: event.id,
        title: event.summary || 'Sin título',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: Boolean(event.start?.date),
        location: event.location || '',
        htmlLink: event.htmlLink || '',
        status: event.status,
      })),
    })
    if (token.refreshedTokens) setTokenCookies(response, token.refreshedTokens)
    return response
  } catch {
    return NextResponse.json({ error: 'Calendar is not configured' }, { status: 503 })
  }
}
