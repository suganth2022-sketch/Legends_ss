import 'server-only';
import type { NextResponse } from 'next/server';
import { serverEnv } from './env';

export const ACCESS_COOKIE = 'lm_access';
export const REFRESH_COOKIE = 'lm_refresh';

const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

const baseCookie = () => ({
  httpOnly: true,
  secure: serverEnv.isProduction,
  sameSite: 'lax' as const,
  path: '/',
});

export function setSessionCookies(res: NextResponse, tokens: TokenPair) {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookie(),
    maxAge: tokens.expiresIn ?? 900,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookie(),
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { ...baseCookie(), maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { ...baseCookie(), maxAge: 0 });
}

export async function refreshSession(refreshToken: string): Promise<TokenPair | null> {
  const res = await fetch(`${serverEnv.backendUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<TokenPair>;
  if (!data.accessToken || !data.refreshToken) return null;
  return data as TokenPair;
}

// State-changing requests must originate from this site. SameSite=Lax already
// blocks cross-site POSTs carrying the cookie; this is defence in depth.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser callers
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : undefined;
}
