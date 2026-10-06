import { NextResponse, type NextRequest } from 'next/server';

// UX-level gate only: sends signed-out visitors to /login and members/admins
// to their own area. It does NOT verify the JWT — every backend endpoint
// enforces authentication and roles itself, so a forged cookie gets no data.
function userTypeFromToken(token: string | undefined): 'MEMBER' | 'ADMIN' | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.userType === 'ADMIN' || payload.userType === 'MEMBER' ? payload.userType : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get('lm_access')?.value;
  const hasSession = !!access || !!req.cookies.get('lm_refresh')?.value;

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Only redirect on a role mismatch when the role is readable; an expired
  // access cookie falls through and the proxy refreshes it.
  const type = userTypeFromToken(access);
  const needs = pathname.startsWith('/admin') ? 'ADMIN' : 'MEMBER';
  if (type && type !== needs) {
    return NextResponse.redirect(new URL(type === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/member/:path*', '/admin/:path*'] };
