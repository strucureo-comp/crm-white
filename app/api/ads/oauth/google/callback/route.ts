import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/utils/encryption';
import { saveGoogleAdsAccount } from '@/lib/db/ads/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateStr = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/social?error=${error}`);
  }

  if (!code || !stateStr) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  let stateObj;
  try {
    stateObj = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
  } catch (err) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  const tenantId = stateObj.tenant_id;
  const stateNonce = stateObj.nonce;

  if (!tenantId || !stateNonce) {
    return NextResponse.json({ error: 'Invalid state parameters' }, { status: 400 });
  }

  // 1. CSRF Validation: Check nonce against the secure cookie
  const cookieNonce = request.cookies.get('oauth_nonce')?.value;
  if (!cookieNonce || cookieNonce !== stateNonce) {
    console.error('CSRF validation failed: nonce mismatch');
    return NextResponse.redirect(`${baseUrl}/social?error=invalid_csrf_token`);
  }

  // 2. Tenant Authorization: Ensure the authenticated user actually belongs to this tenant
  const authorizedCompanyId = request.headers.get('x-company-id');
  if (authorizedCompanyId && authorizedCompanyId !== tenantId) {
    console.error('Tenant authorization failed: x-company-id does not match state tenant_id');
    return NextResponse.redirect(`${baseUrl}/social?error=unauthorized_tenant_access`);
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI!;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

  // 1. Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    console.error('Token exchange error:', tokenData);
    return NextResponse.redirect(`${baseUrl}/social?error=token_exchange_failed`);
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;

  // 2. Fetch accessible customers
  const customersResponse = await fetch('https://googleads.googleapis.com/v16/customers:listAccessibleCustomers', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
  });

  const customersData = await customersResponse.json();
  
  if (customersData.error) {
    console.error('Failed to fetch accessible customers:', customersData.error);
    return NextResponse.redirect(`${baseUrl}/social?error=failed_fetching_customers`);
  }

  const resourceNames = customersData.resourceNames || [];
  if (resourceNames.length === 0) {
    return NextResponse.redirect(`${baseUrl}/social?error=no_ads_accounts`);
  }

  // Use the first accessible customer for now
  const customerId = resourceNames[0].split('/')[1];

  // 3. Save to database
  await saveGoogleAdsAccount(tenantId, {
    tenant_id: tenantId,
    customer_id: customerId,
    account_name: `Google Ads Account`,
    access_token_encrypted: encrypt(accessToken),
    refresh_token_encrypted: refreshToken ? encrypt(refreshToken) : undefined,
    token_expiry: Date.now() + (expiresIn * 1000),
    scopes: tokenData.scope,
    status: 'connected',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(`${baseUrl}/social?success=google_ads_connected`);
}
