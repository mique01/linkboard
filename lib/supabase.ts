import type { NextRequest } from 'next/server';

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

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

async function fetchSupabase<T>(
  path: string,
  init: RequestInit,
  options?: {
    useServiceRole?: boolean;
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

  if (options?.useServiceRole) {
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

export async function supabaseAdminRequest<T>(
  path: string,
  init: RequestInit = {}
) {
  return fetchSupabase<T>(path, init, { useServiceRole: true });
}

export function getDeviceIdFromRequest(req: NextRequest) {
  const deviceId =
    req.headers.get('x-device-id')?.trim() ??
    req.nextUrl.searchParams.get('deviceId')?.trim() ??
    '';

  if (!deviceId) {
    return null;
  }

  return deviceId.slice(0, 128);
}
