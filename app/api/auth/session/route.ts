import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { idToken, companyId } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    // Verify the Firebase ID token using RSA-SHA256 signature verification
    const verified = await verifyAuthToken(idToken);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const uid = verified.uid;

    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days

    const response = NextResponse.json({ success: true, uid });
    
    // Store JSON in cookie encoded as base64 for easy middleware decoding
    const sessionData = {
      uid,
      companyId: companyId || '',
      exp: Date.now() + expiresIn
    };
    
    response.cookies.set('__session', Buffer.from(JSON.stringify(sessionData)).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
