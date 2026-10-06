import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, isSameOrigin } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
