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
  const sessionCookie = req.cookies.get('__session')?.value;
  
  let sessionValid = false;
  let companyId = '';

  if (sessionCookie) {
    try {
      // Decode base64 JSON payload
      const decoded = JSON.parse(atob(sessionCookie));
      // Verify token hasn't expired
      const notExpired = !decoded.exp || decoded.exp > Date.now();
      sessionValid = !!decoded.uid && notExpired;
      companyId = decoded.companyId || '';
    } catch (e) {
      // Fallback for legacy generic sessions (dev_uid_timestamp)
      sessionValid = sessionCookie.startsWith('dev_');
    }
  }

  if (pathname.startsWith('/api/')) {
    if (isPublicApiPath) {
      return NextResponse.next();
    }

    // Programmatic API Access (e.g., /api/v1/*)
    if (pathname.startsWith('/api/v1/')) {
      const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
      const wsId = req.headers.get('x-workspace-id');

      if (!apiKey || !wsId) {
        return NextResponse.json({ error: 'Missing x-api-key or x-workspace-id header' }, { status: 401 });
      }

      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const url = `https://${projectId}-default-rtdb.firebaseio.com/workspaces/${wsId}/settings/api/keys.json`;
        const res = await fetch(url);
        
        if (!res.ok) {
          return NextResponse.json({ error: 'Failed to validate API key' }, { status: 500 });
        }
        
        const keys = await res.json();
        
        if (!keys || !Array.isArray(keys)) {
          return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        const validKey = keys.find((k: any) => k.key === apiKey);
        
        if (!validKey) {
          return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        // Key is valid, inject company_id
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-company-id', wsId);
        requestHeaders.set('x-api-permission', validKey.permission || 'read');

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          }
        });
      } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }

    if (!sessionValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Inject company_id into headers for the internal API to consume
    const requestHeaders = new Headers(req.headers);
    if (companyId) {
      requestHeaders.set('x-company-id', companyId);
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  const isProtectedRoute = !isPublicPath && !pathname.startsWith('/api');

  if (isProtectedRoute) {
    if (!sessionValid) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Allow public paths with session (login, register redirect to dashboard via client-side)
  // But /setup needs session to work, so don't redirect away from it
  if (isPublicPath && sessionValid && pathname !== '/setup') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // IP Whitelisting Check for protected routes
  if (isProtectedRoute && sessionValid && companyId) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const url = `https://${projectId}-default-rtdb.firebaseio.com/workspaces/${companyId}/settings/security/ip_whitelist.json`;
      const res = await fetch(url);
      
      if (res.ok) {
        const ipWhitelist = await res.json();
        if (ipWhitelist && Array.isArray(ipWhitelist) && ipWhitelist.length > 0) {
          // Get client IP
          const clientIp = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
          
          if (clientIp) {
            // Check if IP matches any in whitelist (simple match for now)
            const isAllowed = ipWhitelist.includes(clientIp);
            if (!isAllowed) {
              // Redirect to a 403 or logout, or return plain response
              return new NextResponse('Forbidden: Your IP address is not whitelisted for this workspace.', { status: 403 });
            }
          }
        }
      }
    } catch (error) {
      console.error('IP Whitelist check failed', error);
      // Fail open to avoid locking users out on DB error
    }
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
