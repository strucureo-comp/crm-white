// ============================================================================
// Google Ads — OAuth (server-only)
//
// Google Ads exposes a single OAuth scope (`adwords`) that covers both reads and
// writes, so read-only behaviour is enforced in code: this integration issues
// only `listAccessibleCustomers` and `googleAds:search` calls, never `:mutate`.
// ============================================================================
import { GoogleAdsError } from '@/lib/connectors/google/client';
import { AdIntegrationError } from '../errors';
import type { AdAccountRef } from '../types';

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/adwords'];
const API_BASE = 'https://googleads.googleapis.com/v25';
/** Upper bound on manager accounts expanded during account discovery. */
const MAX_ACCESSIBLE_CUSTOMERS = 20;

export interface GoogleAppConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  redirectUri: string;
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
}

export function googleRedirectUri(): string {
  return `${appBaseUrl()}/api/ads/oauth/google/callback`;
}

/** True when the server has Google Ads app credentials configured. */
export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      appBaseUrl(),
  );
}

export function getGoogleAppConfig(): GoogleAppConfig {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || '';
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

  if (!clientId || !clientSecret || !developerToken) {
    throw new AdIntegrationError({
      kind: 'config',
      message: 'Google Ads is not configured on the server. Ask an administrator to set it up.',
      needsReauth: false,
      retryable: false,
    });
  }
  if (!appBaseUrl()) {
    throw new AdIntegrationError({
      kind: 'config',
      message: 'NEXT_PUBLIC_APP_URL must be set before Google Ads can be connected.',
      needsReauth: false,
      retryable: false,
    });
  }

  return { clientId, clientSecret, developerToken, redirectUri: googleRedirectUri() };
}

/** Builds the consent URL. `access_type=offline` is what yields a refresh token. */
export function buildGoogleAuthUrl(state: string): string {
  const config = getGoogleAppConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  // Forces a refresh token even if the user previously authorized the app.
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  scopes: string[];
}

/** Exchanges the authorization code for an access token and refresh token. */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  const config = getGoogleAppConfig();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }
    | null;

  if (!response.ok || !body?.access_token) {
    // Log only the OAuth error code — the body can contain the client secret.
    throw new GoogleAdsError(
      `Google token exchange failed (${body?.error || response.status})`,
      response.status,
    );
  }
  if (!body.refresh_token) {
    throw new AdIntegrationError({
      kind: 'auth',
      message:
        'Google did not return a refresh token. Remove the CRM from your Google account permissions and connect again.',
      needsReauth: true,
      retryable: false,
    });
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
    scopes: GOOGLE_SCOPES,
  };
}

/** Best-effort token revocation on disconnect. */
export async function revokeGoogleAccess(refreshToken: string): Promise<void> {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => undefined);
}

/**
 * Mints a short-lived access token from a stored refresh token, for the account
 * listing calls that happen outside a `GoogleAdsClient` request.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const config = getGoogleAppConfig();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { access_token?: string; error?: string }
    | null;

  if (!response.ok || !body?.access_token) {
    // Only the error code is surfaced — the body can echo the client secret.
    throw new GoogleAdsError(
      `Google token refresh failed (${body?.error || response.status})`,
      response.status || 401,
    );
  }

  return body.access_token;
}

// ---------------------------------------------------------------------------
// Account discovery
// ---------------------------------------------------------------------------
interface CustomerClientRow {
  customerClient?: {
    id?: string;
    descriptiveName?: string;
    currencyCode?: string;
    manager?: boolean;
    status?: string;
  };
}

async function listAccessibleCustomerIds(
  accessToken: string,
  developerToken: string,
): Promise<string[]> {
  const response = await fetch(`${API_BASE}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
  });

  const body = (await response.json().catch(() => null)) as
    | { resourceNames?: string[]; error?: { message?: string; code?: number } }
    | null;

  if (!response.ok) {
    throw new GoogleAdsError(
      body?.error?.message || 'Could not list Google Ads accounts',
      response.status,
      body?.error?.code,
    );
  }

  return (body?.resourceNames || []).map((name) => name.split('/').pop() || '').filter(Boolean);
}

/**
 * Expands one accessible customer into the list of accounts that can actually
 * hold campaigns. A manager account returns its whole hierarchy; a standard
 * account returns just itself. Manager rows are dropped because they have no
 * campaigns of their own.
 */
async function expandCustomer(
  accessToken: string,
  developerToken: string,
  rootCustomerId: string,
): Promise<AdAccountRef[]> {
  const query =
    'SELECT customer_client.id, customer_client.descriptive_name, ' +
    'customer_client.currency_code, customer_client.manager, customer_client.status ' +
    "FROM customer_client WHERE customer_client.status = 'ENABLED'";

  const response = await fetch(`${API_BASE}/customers/${rootCustomerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'login-customer-id': rootCustomerId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    // A single inaccessible account must not block the rest of the list.
    return [];
  }

  const body = (await response.json().catch(() => null)) as { results?: CustomerClientRow[] } | null;

  return (body?.results || [])
    .map((row) => row.customerClient)
    .filter((client): client is NonNullable<CustomerClientRow['customerClient']> =>
      Boolean(client?.id) && client?.manager !== true,
    )
    .map((client) => ({
      id: String(client.id),
      name: client.descriptiveName || `Account ${client.id}`,
      currency: client.currencyCode,
      loginCustomerId: rootCustomerId,
      inactive: client.status !== undefined && client.status !== 'ENABLED',
    }));
}

/** Lists every Google Ads account the authorizing user can read campaigns for. */
export async function listGoogleAdAccounts(accessToken: string): Promise<AdAccountRef[]> {
  const { developerToken } = getGoogleAppConfig();
  const rootIds = (await listAccessibleCustomerIds(accessToken, developerToken)).slice(
    0,
    MAX_ACCESSIBLE_CUSTOMERS,
  );

  const expanded = await Promise.all(
    rootIds.map((id) => expandCustomer(accessToken, developerToken, id)),
  );

  // De-duplicate: an account reachable through two managers appears twice.
  const byId = new Map<string, AdAccountRef>();
  for (const account of expanded.flat()) {
    if (!byId.has(account.id)) byId.set(account.id, account);
  }
  return Array.from(byId.values());
}
