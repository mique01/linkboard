import type { NextRequest } from 'next/server';

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ''
  );
}

export function getSupabaseServiceRoleKey() {
  return requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function isJwtLike(value: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function parseTokenCandidate(value: string) {
  if (!value) {
    return null;
  }

  if (isJwtLike(value)) {
    return value;
  }

  const candidates = [value];

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      candidates.push(decoded);
    }
  } catch {
    // Ignore malformed cookie encoding.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Json;

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        typeof parsed.access_token === 'string' &&
        isJwtLike(parsed.access_token)
      ) {
        return parsed.access_token;
      }

      if (
        Array.isArray(parsed) &&
        typeof parsed[0] === 'string' &&
        isJwtLike(parsed[0])
      ) {
        return parsed[0];
      }
    } catch {
      // Not JSON.
    }
  }

  return null;
}

function extractAccessTokenFromRequest(req: NextRequest) {
  const authorization = req.headers.get('authorization');

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const priorityCookieNames = [
    'sb-access-token',
    'supabase-auth-token',
    'access-token',
  ];

  for (const name of priorityCookieNames) {
    const cookieValue = req.cookies.get(name)?.value;
    const token = cookieValue ? parseTokenCandidate(cookieValue) : null;

    if (token) {
      return token;
    }
  }

  for (const cookie of req.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-')) {
      continue;
    }

    const token = parseTokenCandidate(cookie.value);
    if (token) {
      return token;
    }
  }

  return null;
}

async function fetchSupabase<T>(
  path: string,
  init: RequestInit,
  options?: {
    useServiceRole?: boolean;
    accessToken?: string;
  }
) {
  const apiKey = options?.useServiceRole
    ? getSupabaseServiceRoleKey()
    : getSupabaseAnonKey();

  if (!apiKey) {
    throw new Error(
      'Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  const headers = new Headers(init.headers);
  headers.set('apikey', apiKey);
  headers.set('Content-Type', 'application/json');

  if (options?.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  } else if (options?.useServiceRole) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  const response = await fetch(`${getSupabaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T | { message?: string }) : null;

  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      typeof data.message === 'string'
        ? data.message
        : `Supabase request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  return data as T;
}

export async function getAuthenticatedUser(req: NextRequest) {
  const accessToken = extractAccessTokenFromRequest(req);

  if (!accessToken) {
    return null;
  }

  try {
    const user = await fetchSupabase<AuthenticatedUser>('/auth/v1/user', {
      method: 'GET',
    }, {
      accessToken,
    });

    return user ?? null;
  } catch {
    return null;
  }
}

export async function supabaseAdminRequest<T>(
  path: string,
  init: RequestInit = {}
) {
  return fetchSupabase<T>(path, init, { useServiceRole: true });
}
