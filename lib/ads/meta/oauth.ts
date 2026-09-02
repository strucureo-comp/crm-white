// ============================================================================
// Meta Ads — OAuth (server-only)
//
// Read-only integration: the only scope requested is `ads_read`, which cannot
// create or modify campaigns even if the rest of the app were compromised.
// ============================================================================
import { MetaClientError } from '@/lib/connectors/meta/client';
import { AdIntegrationError } from '../errors';
import type { AdAccountRef } from '../types';

/** Scopes needed for Pages, Instagram, and Ads management */
const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_metadata',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'ads_management',
  'ads_read'
];

export interface MetaAppConfig {
  appId: string;
  appSecret: string;
  apiVersion: string;
  redirectUri: string;
}

function appBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_APP_URL || '';
  if (!url || (process.env.NODE_ENV === 'production' && url.includes('localhost'))) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      url = `https://${process.env.VERCEL_URL}`;
    } else {
      url = 'https://crm.t4gverse.com';
    }
  }
  return url.replace(/\/+$/, '');
}

export function metaRedirectUri(): string {
  if (process.env.META_REDIRECT_URI) {
    return process.env.META_REDIRECT_URI;
  }
  return `${appBaseUrl()}/api/ads/oauth/meta/callback`;
}

/** True when the server has Meta app credentials configured. */
export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && appBaseUrl());
}

function getMetaAppConfig(): MetaAppConfig {
  const appId = process.env.META_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || '';
  if (!appId || !appSecret) {
    throw new AdIntegrationError({
      kind: 'config',
      message: 'Meta Ads is not configured on the server. Ask an administrator to set it up.',
      needsReauth: false,
      retryable: false,
    });
  }
  if (!appBaseUrl()) {
    throw new AdIntegrationError({
      kind: 'config',
      message: 'NEXT_PUBLIC_APP_URL must be set before Meta Ads can be connected.',
      needsReauth: false,
      retryable: false,
    });
  }
  return {
    appId,
    appSecret,
    apiVersion: process.env.META_ADS_API_VERSION || 'v25.0',
    redirectUri: metaRedirectUri(),
  };
}

/** Builds the URL the user is redirected to in order to grant `ads_read`. */
export function buildMetaAuthUrl(state: string): string {
  const config = getMetaAppConfig();
  const url = new URL(`https://www.facebook.com/${config.apiVersion}/dialog/oauth`);
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', META_SCOPES.join(','));
  return url.toString();
}

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string; code?: number; type?: string };
}

async function requestToken(url: URL, scope: string): Promise<MetaTokenResponse> {
  const response = await fetch(url.toString(), { method: 'GET' });
  const body = (await response.json().catch(() => null)) as MetaTokenResponse | null;

  if (!response.ok || !body?.access_token) {
    // The provider echoes the code/secret in some error bodies — never surface it.
    throw new MetaClientError(
      `Meta ${scope} exchange failed`,
      response.status,
      body?.error?.code,
      body?.error?.type,
    );
  }
  return body;
}

export interface MetaTokens {
  accessToken: string;
  expiresAt?: number;
  scopes: string[];
}

/**
 * Exchanges the authorization code for a short-lived token, then upgrades it to
 * a long-lived (≈60 day) token so background syncs keep working.
 */
export async function exchangeMetaCode(code: string): Promise<MetaTokens> {
  const config = getMetaAppConfig();
  const base = `https://graph.facebook.com/${config.apiVersion}/oauth/access_token`;

  const shortLivedUrl = new URL(base);
  shortLivedUrl.searchParams.set('client_id', config.appId);
  shortLivedUrl.searchParams.set('client_secret', config.appSecret);
  shortLivedUrl.searchParams.set('redirect_uri', config.redirectUri);
  shortLivedUrl.searchParams.set('code', code);
  const shortLived = await requestToken(shortLivedUrl, 'code');

  const longLivedUrl = new URL(base);
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longLivedUrl.searchParams.set('client_id', config.appId);
  longLivedUrl.searchParams.set('client_secret', config.appSecret);
  longLivedUrl.searchParams.set('fb_exchange_token', shortLived.access_token!);

  let token = shortLived;
  try {
    token = await requestToken(longLivedUrl, 'long-lived token');
  } catch {
    // Fall back to the short-lived token; the connection will simply need
    // re-authorizing sooner, which the UI already surfaces.
  }

  return {
    accessToken: token.access_token!,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
    scopes: META_SCOPES,
  };
}

interface MetaAdAccountRow {
  id?: string;
  name?: string;
  currency?: string;
  account_status?: number;
}

/**
 * Lists the ad accounts the authorizing user can read. `account_status` 1 is
 * ACTIVE; anything else is surfaced but marked inactive so the user can still
 * pick it knowingly.
 */
export async function listMetaAdAccounts(accessToken: string): Promise<AdAccountRef[]> {
  const config = getMetaAppConfig();
  const url = new URL(`https://graph.facebook.com/${config.apiVersion}/me/adaccounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,name,currency,account_status');
  url.searchParams.set('limit', '200');

  const response = await fetch(url.toString());
  const body = (await response.json().catch(() => null)) as
    | { data?: MetaAdAccountRow[]; error?: { message?: string; code?: number; type?: string } }
    | null;

  if (!response.ok || body?.error) {
    throw new MetaClientError(
      body?.error?.message || 'Could not list Meta ad accounts',
      response.status,
      body?.error?.code,
      body?.error?.type,
    );
  }

  return (body?.data || [])
    .filter((row): row is MetaAdAccountRow & { id: string } => Boolean(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name || row.id,
      currency: row.currency,
      inactive: row.account_status !== undefined && row.account_status !== 1,
    }));
}

export interface MetaPageRef {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

export async function listMetaPages(accessToken: string): Promise<MetaPageRef[]> {
  const config = getMetaAppConfig();
  const url = new URL(`https://graph.facebook.com/${config.apiVersion}/me/accounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}');
  url.searchParams.set('limit', '100');

  const response = await fetch(url.toString());
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new MetaClientError(
      body?.error?.message || 'Could not list Meta Pages',
      response.status,
      body?.error?.code,
      body?.error?.type,
    );
  }

  return body?.data || [];
}

/**
 * Best-effort revocation of the app's permissions on disconnect. Failure is
 * ignored: the local credential is deleted either way.
 */
export async function revokeMetaAccess(accessToken: string): Promise<void> {
  const apiVersion = process.env.META_ADS_API_VERSION || 'v25.0';
  const url = new URL(`https://graph.facebook.com/${apiVersion}/me/permissions`);
  url.searchParams.set('access_token', accessToken);
  await fetch(url.toString(), { method: 'DELETE' }).catch(() => undefined);
}
