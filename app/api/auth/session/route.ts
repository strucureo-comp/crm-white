import { NextResponse } from 'next/server';
import { getAdminAuth, isAdminAvailable } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days

    const adminAvailable = isAdminAvailable();

    if (adminAvailable) {
      const adminAuth = getAdminAuth();
      const decoded = await adminAuth.verifyIdToken(idToken);
      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

      const response = NextResponse.json({ success: true, uid: decoded.uid });
      response.cookies.set('__session', sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresIn / 1000,
        path: '/',
      });

      return response;
    }

    // Dev mode: extract UID from the JWT without Admin SDK verification.
    // The client-side Firebase SDK already validated this token.
    // In production, set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    const uid: string = payload.uid || payload.sub;

    const response = NextResponse.json({ success: true, uid, mode: 'dev' });
    response.cookies.set('__session', `dev_${uid}_${Date.now()}`, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('__session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
