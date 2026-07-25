import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/forgot-password', '/setup'];
const publicApiPaths = ['/api/enquiries', '/api/auth/session'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') {
    const session = req.cookies.get('__session')?.value;
    return NextResponse.redirect(new URL(session ? '/dashboard' : '/login', req.url));
  }

  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname === '/favicon.ico';

  if (isStaticAsset) {
    return NextResponse.next();
  }

  const isPublicApiPath = publicApiPaths.some(p => pathname.startsWith(p));
  const isPublicPath = publicPaths.some(p => pathname === p);
  const session = req.cookies.get('__session')?.value;

  if (pathname.startsWith('/api/')) {
    if (isPublicApiPath) {
      return NextResponse.next();
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isProtectedRoute = !isPublicPath && !pathname.startsWith('/api');

  if (isProtectedRoute) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Allow public paths with session (login, register redirect to dashboard via client-side)
  // But /setup needs session to work, so don't redirect away from it
  if (isPublicPath && session && pathname !== '/setup') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
