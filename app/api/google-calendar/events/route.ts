import { NextRequest, NextResponse } from 'next/server'
import {
  getAccessToken,
  GOOGLE_CALENDAR_EMAIL,
  googleProfile,
  setTokenCookies,
} from '@/lib/google-calendar'

function mapEvent(event: Record<string, any>) {
  const videoEntry = event.conferenceData?.entryPoints?.find(
    (entry: Record<string, any>) => entry.entryPointType === 'video',
  )
  return {
    id: event.id,
    title: event.summary || 'Sin título',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    allDay: Boolean(event.start?.date),
    description: event.description || '',
    location: event.location || '',
    htmlLink: event.htmlLink || '',
    meetLink: event.hangoutLink || videoEntry?.uri || '',
    conferenceData: event.conferenceData || null,
    attendees: (event.attendees || []).map((attendee: Record<string, any>) => ({
      email: attendee.email,
      name: attendee.displayName || attendee.email,
      responseStatus: attendee.responseStatus || 'needsAction',
      organizer: Boolean(attendee.organizer),
      self: Boolean(attendee.self),
    })),
    organizer: event.organizer || null,
    creator: event.creator || null,
    recurringEventId: event.recurringEventId || null,
    status: event.status,
  }
}

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
    const response = NextResponse.json({ events: (data.items || []).map(mapEvent) })
    if (token.refreshedTokens) setTokenCookies(response, token.refreshedTokens)
    return response
  } catch {
    return NextResponse.json({ error: 'Calendar is not configured' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken(req)
    if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })
    const profile = await googleProfile(token.accessToken)
    if (profile?.email?.toLowerCase() !== GOOGLE_CALENDAR_EMAIL) {
      return NextResponse.json({ error: 'Wrong Google account' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.title || !body.start || !body.end) {
      return NextResponse.json({ error: 'Title, start and end are required' }, { status: 400 })
    }
    const eventBody: Record<string, any> = {
      summary: String(body.title).trim(),
      description: String(body.description || '').trim(),
      location: String(body.location || '').trim(),
      start: { dateTime: body.start, timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: body.end, timeZone: 'America/Argentina/Buenos_Aires' },
      attendees: Array.isArray(body.attendees)
        ? body.attendees.filter(Boolean).map((email: string) => ({ email }))
        : [],
      reminders: { useDefault: true },
    }
    if (body.createMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `linkboard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }

    const params = new URLSearchParams({ conferenceDataVersion: '1', sendUpdates: 'all' })
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(eventBody),
        cache: 'no-store',
      },
    )
    const data = await calendarResponse.json()
    if (!calendarResponse.ok) {
      return NextResponse.json({ error: data.error?.message || 'Could not create event' }, { status: 502 })
    }
    const response = NextResponse.json({ event: mapEvent(data) }, { status: 201 })
    if (token.refreshedTokens) setTokenCookies(response, token.refreshedTokens)
    return response
  } catch {
    return NextResponse.json({ error: 'Could not create event' }, { status: 500 })
  }
}
