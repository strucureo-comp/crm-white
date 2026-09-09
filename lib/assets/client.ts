// ============================================================================
// Browser client for the Assets API
//
// Every call carries the caller's Firebase ID token; the server re-checks
// workspace membership on each request.
// ============================================================================
'use client';

import { auth } from '@/lib/firebase/config';

export class AssetsApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AssetsApiError';
    this.status = status;
    this.code = code;
  }
}

export interface Asset {
  id: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  folder: string;
  driveFileId: string;
  driveViewLink?: string;
  thumbnailLink?: string;
  uid: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveConnectionStatus {
  connected: boolean;
  email?: string;
  displayName?: string;
  connectedAt?: string;
  driveFolderId?: string;
}

export interface AssetCounts {
  image?: number;
  video?: number;
  pdf?: number;
  document?: number;
}

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new AssetsApiError('Not authenticated', 401, 'unauthenticated');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; code?: string })
    | null;

  if (!response.ok) {
    throw new AssetsApiError(
      body?.error || 'The request could not be completed',
      response.status,
      body?.code,
    );
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Drive connection
// ---------------------------------------------------------------------------

export async function getDriveStatus(workspaceId: string): Promise<DriveConnectionStatus> {
  return authedFetch<DriveConnectionStatus>(
    `/api/assets/status?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

export async function connectDrive(workspaceId: string): Promise<{ url: string }> {
  return authedFetch<{ url: string }>(
    `/api/assets/connect?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

export async function disconnectDrive(workspaceId: string): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(
    `/api/assets/disconnect?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Assets CRUD
// ---------------------------------------------------------------------------

export interface ListAssetsParams {
  workspaceId: string;
  folder?: string;
  type?: string;
}

export async function listAssets(
  params: ListAssetsParams,
): Promise<{ assets: Asset[]; counts: AssetCounts }> {
  const query = new URLSearchParams({ workspaceId: params.workspaceId });
  if (params.folder) query.set('folder', params.folder);
  if (params.type) query.set('type', params.type);

  return authedFetch<{ assets: Asset[]; counts: AssetCounts }>(
    `/api/assets?${query.toString()}`,
  );
}

export async function getAsset(
  workspaceId: string,
  assetId: string,
): Promise<{ asset: Asset }> {
  return authedFetch<{ asset: Asset }>(
    `/api/assets/${assetId}?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

export async function uploadAsset(
  workspaceId: string,
  file: File,
  folder: string,
): Promise<{ asset: Asset }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new AssetsApiError('Not authenticated', 401, 'unauthenticated');

  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-workspace-id': workspaceId,
    },
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as
    | { asset?: Asset; error?: string; code?: string }
    | null;

  if (!response.ok) {
    throw new AssetsApiError(
      body?.error || 'Upload failed',
      response.status,
      body?.code,
    );
  }

  return { asset: body!.asset! };
}

export async function deleteAsset(
  workspaceId: string,
  assetId: string,
): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(
    `/api/assets/${assetId}?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'DELETE' },
  );
}
