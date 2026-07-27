import { NextRequest, NextResponse } from 'next/server'
import {
  getAccessToken,
  GOOGLE_CALENDAR_EMAIL,
  googleProfile,
  setTokenCookies,
} from '@/lib/google-calendar'

async function authorize(req: NextRequest) {
  const token = await getAccessToken(req)
  if (!token) return null
  const profile = await googleProfile(token.accessToken)
  if (profile?.email?.toLowerCase() !== GOOGLE_CALENDAR_EMAIL) return null
  return token
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await authorize(req)
    if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })
    const { id } = await context.params
    const body = await req.json()
    const currentResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
      { headers: { authorization: `Bearer ${token.accessToken}` }, cache: 'no-store' },
    )
    const current = currentResponse.ok ? await currentResponse.json() : { attendees: [] }
    const currentAttendees = new Map(
      (current.attendees || []).map((attendee: Record<string, any>) => [
        String(attendee.email || '').toLowerCase(),
        attendee,
      ]),
    )
    const eventBody: Record<string, any> = {
      summary: String(body.title || '').trim(),
      description: String(body.description || '').trim(),
      location: String(body.location || '').trim(),
      start: { dateTime: body.start, timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: body.end, timeZone: 'America/Argentina/Buenos_Aires' },
      attendees: Array.isArray(body.attendees)
        ? body.attendees.filter(Boolean).map((email: string) => ({
            ...(currentAttendees.get(email.toLowerCase()) || {}),
            email,
          }))
        : [],
    }
    const params = new URLSearchParams({ conferenceDataVersion: '1', sendUpdates: 'all' })
    if (body.createMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `linkboard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}?${params}`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${token.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(eventBody),
        cache: 'no-store',
      },
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Could not update event' }, { status: 502 })
    }
    const result = NextResponse.json({ event: data })
    if (token.refreshedTokens) setTokenCookies(result, token.refreshedTokens)
    return result
  } catch {
    return NextResponse.json({ error: 'Could not update event' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await authorize(req)
    if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })
    const { id } = await context.params
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token.accessToken}` },
        cache: 'no-store',
      },
    )
    if (!response.ok) return NextResponse.json({ error: 'Could not delete event' }, { status: 502 })
    const result = NextResponse.json({ deleted: true })
    if (token.refreshedTokens) setTokenCookies(result, token.refreshedTokens)
    return result
  } catch {
    return NextResponse.json({ error: 'Could not delete event' }, { status: 500 })
  }
}
