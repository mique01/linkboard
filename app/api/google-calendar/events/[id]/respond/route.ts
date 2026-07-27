import { NextRequest, NextResponse } from 'next/server'
import {
  getAccessToken,
  GOOGLE_CALENDAR_EMAIL,
  googleProfile,
  setTokenCookies,
} from '@/lib/google-calendar'

const allowed = new Set(['accepted', 'declined', 'tentative'])

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getAccessToken(req)
    if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })
    const profile = await googleProfile(token.accessToken)
    if (profile?.email?.toLowerCase() !== GOOGLE_CALENDAR_EMAIL) {
      return NextResponse.json({ error: 'Wrong Google account' }, { status: 403 })
    }
    const { id } = await context.params
    const { responseStatus } = await req.json()
    if (!allowed.has(responseStatus)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
    }

    const eventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
      { headers: { authorization: `Bearer ${token.accessToken}` }, cache: 'no-store' },
    )
    const event = await eventResponse.json()
    if (!eventResponse.ok) {
      return NextResponse.json({ error: 'Could not read event' }, { status: 502 })
    }
    const attendees = (event.attendees || []).map((attendee: Record<string, any>) =>
      attendee.self || attendee.email?.toLowerCase() === GOOGLE_CALENDAR_EMAIL
        ? { ...attendee, responseStatus }
        : attendee,
    )
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${token.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ attendees }),
        cache: 'no-store',
      },
    )
    if (!response.ok) return NextResponse.json({ error: 'Could not respond' }, { status: 502 })
    const result = NextResponse.json({ updated: true })
    if (token.refreshedTokens) setTokenCookies(result, token.refreshedTokens)
    return result
  } catch {
    return NextResponse.json({ error: 'Could not respond' }, { status: 500 })
  }
}
