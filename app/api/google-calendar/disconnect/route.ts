import { NextResponse } from 'next/server'
import { clearGoogleCookies } from '@/lib/google-calendar'

export async function POST() {
  const response = NextResponse.json({ disconnected: true })
  clearGoogleCookies(response)
  return response
}
