import { NextRequest, NextResponse } from 'next/server';

const CANONICAL_HOST = 'linkboard-m5wi.vercel.app';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const isLocal =
    host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isOtherVercelHost =
    host.endsWith('.vercel.app') && host !== CANONICAL_HOST;

  if (!isLocal && isOtherVercelHost) {
    const url = req.nextUrl.clone();
    url.protocol = 'https';
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image).*)'],
};
