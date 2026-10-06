import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/server/env';
import { clientIp, isSameOrigin, setSessionCookies } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

// Browser -> Next -> NestJS. Tokens are issued by the backend but stored only
// in httpOnly cookies; the browser never sees them (no localStorage, so no
// token theft via XSS).
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: { kind?: string; identifier?: string; username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const isAdmin = body.kind === 'ADMIN';
  const path = isAdmin ? '/auth/admin/login' : '/auth/login';
  const payload = isAdmin
    ? { username: body.username, password: body.password }
    : { identifier: body.identifier, password: body.password };

  const ip = clientIp(req);
  const upstream = await fetch(`${serverEnv.backendUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(ip ? { 'x-forwarded-for': ip } : {}),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json({ message: data.message ?? 'Login failed' }, { status: upstream.status });
  }

  const res = NextResponse.json({ user: { ...data.user, userType: isAdmin ? 'ADMIN' : 'MEMBER' } });
  setSessionCookies(res, data);
  return res;
}
