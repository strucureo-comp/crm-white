// ============================================================================
// Browser client for the ad integration API
//
// Every call carries the caller's Firebase ID token; the server re-checks
// workspace membership on each request. Nothing here talks to Meta or Google —
// the browser only ever speaks to this app's own API.
// ============================================================================
'use client';

import { auth } from '@/lib/firebase/config';
import type {
  AdAccountRef,
  AdPlatform,
  PublicAdConnection,
  UnifiedCampaignRow,
} from './types';

export type { AdAccountRef, AdPlatform, PublicAdConnection, UnifiedCampaignRow };

export class AdsApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message);
    this.name = 'AdsApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export interface CampaignFeedResponse {
  rows: UnifiedCampaignRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: { all: number; crm: number; meta: number; google: number };
  statuses: string[];
  totals: { spend: number; activeBudget: number };
  lastSyncedAt: string | null;
  connections: PublicAdConnection[];
  providers: { meta: { configured: boolean }; google: { configured: boolean } };
  role: string;
}

export interface SyncOutcomeResponse {
  connectionId: string;
  platform: AdPlatform;
  status: string;
  campaignCount: number;
  warnings: string[];
  error?: string;
  skipped?: boolean;
}

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new AdsApiError('Not authenticated', 401, 'unauthenticated');

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; code?: string; retry_after?: number })
    | null;

  if (!response.ok) {
    throw new AdsApiError(
      body?.error || 'The request could not be completed',
      response.status,
      body?.code,
      body?.retry_after,
    );
  }

  return body as T;
}

export interface CampaignFeedParams {
  workspaceId: string;
  search?: string;
  source?: 'all' | 'crm' | 'meta' | 'google';
  status?: string;
  page?: number;
  pageSize?: number;
}

export function fetchCampaignFeed(params: CampaignFeedParams): Promise<CampaignFeedResponse> {
  const query = new URLSearchParams({ workspaceId: params.workspaceId });
  if (params.search) query.set('search', params.search);
  if (params.source && params.source !== 'all') query.set('source', params.source);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  return authedFetch<CampaignFeedResponse>(`/api/ads/campaigns?${query.toString()}`);
}

/** Returns the provider consent URL to navigate to. */
export async function startAdOAuth(workspaceId: string, platform: AdPlatform, returnTo?: string): Promise<string> {
  const query = new URLSearchParams({ workspaceId });
  if (returnTo) query.set('returnTo', returnTo);
  
  const { url } = await authedFetch<{ url: string }>(
    `/api/ads/oauth/${platform}/start?${query.toString()}`,
  );
  return url;
}

export function fetchAdAccounts(
  workspaceId: string,
  connectionId: string,
): Promise<{ accounts: AdAccountRef[]; warning?: string }> {
  return authedFetch(
    `/api/ads/connections/${connectionId}/accounts?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

export function selectAdAccount(
  workspaceId: string,
  connectionId: string,
  accountId: string,
): Promise<{ selected_account: AdAccountRef; sync: SyncOutcomeResponse }> {
  return authedFetch(`/api/ads/connections/${connectionId}/accounts`, {
    method: 'POST',
    body: JSON.stringify({ workspaceId, accountId }),
  });
}

export function disconnectAdPlatform(
  workspaceId: string,
  connectionId: string,
): Promise<{ disconnected: boolean; platform: AdPlatform }> {
  return authedFetch(
    `/api/ads/connections/${connectionId}?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'DELETE' },
  );
}

export function triggerAdSync(
  workspaceId: string,
  connectionId?: string,
): Promise<{ synced: number; outcomes: SyncOutcomeResponse[] }> {
  return authedFetch('/api/ads/sync', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, connectionId }),
  });
}
