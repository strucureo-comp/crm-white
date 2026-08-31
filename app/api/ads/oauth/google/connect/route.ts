import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Use x-company-id injected by middleware to ensure tenant authorization
  const tenantId = request.headers.get('x-company-id') || searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing or unauthorized tenant_id' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'OAuth configuration missing on server' }, { status: 500 });
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/adwords');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Ensure we get a refresh token
  
  // Generate a CSRF nonce
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Encode tenantId and nonce in state parameter
  const stateObj = { tenant_id: tenantId, nonce: nonce };
  authUrl.searchParams.append('state', Buffer.from(JSON.stringify(stateObj)).toString('base64'));

  const response = NextResponse.redirect(authUrl.toString());
  
  // Set an HTTP-only cookie to validate the nonce on callback
  response.cookies.set('oauth_nonce', nonce, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 60 * 15, // 15 minutes
    path: '/' 
  });

  return response;
}
