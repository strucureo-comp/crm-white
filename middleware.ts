import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/forgot-password', '/api/enquiries'];
const authPaths = ['/login', '/register', '/forgot-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/api/upload') || pathname.startsWith('/api/cron')) {
    const authHeader = req.headers.get('authorization');
    if (pathname.startsWith('/api/cron/billing')) {
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  const isDashboardRoute = pathname.startsWith('/dashboard') || (
    pathname.startsWith('/') && !pathname.startsWith('/api') && !publicPaths.includes(pathname) && !authPaths.includes(pathname)
  );

  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
