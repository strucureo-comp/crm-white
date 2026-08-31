import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
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
  
  // Encode tenantId in state parameter to retrieve it on callback
  const stateObj = { tenant_id: tenantId, nonce: Math.random().toString(36).substring(2) };
  authUrl.searchParams.append('state', Buffer.from(JSON.stringify(stateObj)).toString('base64'));

  return NextResponse.redirect(authUrl.toString());
}
