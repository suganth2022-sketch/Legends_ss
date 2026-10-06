import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/server/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  clientIp,
  isSameOrigin,
  refreshSession,
  setSessionCookies,
  type TokenPair,
} from '@/lib/server/session';

export const dynamic = 'force-dynamic';

// Backend auth endpoints that must never be reachable through the proxy —
// login/refresh are handled by dedicated route handlers that manage cookies.
const BLOCKED_PREFIXES = ['auth/login', 'auth/admin/login', 'auth/refresh'];

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(
  url: string,
  req: NextRequest,
  body: ArrayBuffer | undefined,
  accessToken: string | undefined,
) {
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('accept', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const ip = clientIp(req);
  if (ip) headers.set('x-forwarded-for', ip);

  return fetch(url, { method: req.method, headers, body, cache: 'no-store' });
}

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const joined = path.join('/');

  if (BLOCKED_PREFIXES.some((p) => joined === p || joined.startsWith(`${p}/`))) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && !isSameOrigin(req)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const url = `${serverEnv.backendUrl}/${joined}${req.nextUrl.search}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: TokenPair | null = null;

  // Access cookie expired (the browser dropped it) but a refresh token remains.
  if (!accessToken && refreshToken) {
    rotated = await refreshSession(refreshToken);
    accessToken = rotated?.accessToken;
  }

  let upstream = await forward(url, req, body, accessToken);

  // Access token rejected mid-flight: refresh once and retry.
  if (upstream.status === 401 && refreshToken && !rotated) {
    rotated = await refreshSession(refreshToken);
    if (rotated) {
      upstream = await forward(url, req, body, rotated.accessToken);
    }
  }

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });

  if (rotated && upstream.status !== 401) {
    setSessionCookies(res, rotated);
  } else if (upstream.status === 401 && refreshToken) {
    // Refresh failed or the retry was still rejected: the session is dead.
    clearSessionCookies(res);
  }
  return res;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
