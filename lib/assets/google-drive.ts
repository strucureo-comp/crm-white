// ============================================================================
// Google Drive — OAuth & API helpers (server-only)
//
// Scoped per-company: every connection record is stored under
// `workspaces/{workspaceId}/google_drive_connection`.
// ============================================================================
import { getAdminDatabase } from '@/lib/firebase/admin';

const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

const CONNECTIONS_ROOT = 'google_drive_connections';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
}

export function googleDriveRedirectUri(): string {
  return `${appBaseUrl()}/api/assets/callback`;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      appBaseUrl(),
  );
}

export function getGoogleDriveConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error('Google Drive is not configured on the server.');
  }
  if (!appBaseUrl()) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set before Google Drive can be connected.');
  }

  return { clientId, clientSecret, redirectUri: googleDriveRedirectUri() };
}

// ---------------------------------------------------------------------------
// OAuth URL building
// ---------------------------------------------------------------------------

export function buildGoogleDriveAuthUrl(state: string): string {
  const config = getGoogleDriveConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_DRIVE_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange & refresh
// ---------------------------------------------------------------------------

export interface GoogleDriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  scopes: string[];
}

export async function exchangeGoogleDriveCode(code: string): Promise<GoogleDriveTokens> {
  const config = getGoogleDriveConfig();

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
    throw new Error(`Google token exchange failed (${body?.error || response.status})`);
  }
  if (!body.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Remove the CRM from your Google account permissions and connect again.',
    );
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
    scopes: GOOGLE_DRIVE_SCOPES,
  };
}

export async function refreshGoogleDriveAccessToken(refreshToken: string): Promise<string> {
  const config = getGoogleDriveConfig();

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
    throw new Error(`Google token refresh failed (${body?.error || response.status})`);
  }

  return body.access_token;
}

export async function revokeGoogleDriveAccess(refreshToken: string): Promise<void> {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Connection record (per-workspace)
// ---------------------------------------------------------------------------

export interface GoogleDriveConnection {
  id: string;
  workspaceId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: number;
  scopes: string[];
  uid: string;
  email?: string;
  connectedAt: string;
  driveFolderId?: string;
}

function connectionRef(workspaceId: string) {
  return getAdminDatabase().ref(`${CONNECTIONS_ROOT}/${workspaceId}`);
}

export async function getConnection(workspaceId: string): Promise<GoogleDriveConnection | null> {
  const snapshot = await connectionRef(workspaceId).once('value');
  if (!snapshot.exists()) return null;
  const val = snapshot.val() as Omit<GoogleDriveConnection, 'id' | 'workspaceId'>;
  const id = snapshot.key!;
  return { ...val, id, workspaceId };
}

export async function upsertConnection(
  workspaceId: string,
  data: Omit<GoogleDriveConnection, 'id' | 'workspaceId' | 'connectedAt'>,
): Promise<GoogleDriveConnection> {
  const existing = await connectionRef(workspaceId).once('value');
  const id = existing.key ?? connectionRef(workspaceId).push().key!;

  const record: GoogleDriveConnection = {
    ...data,
    id,
    workspaceId,
    connectedAt: new Date().toISOString(),
  };

  await connectionRef(workspaceId).set(record);
  return record;
}

export async function deleteConnection(workspaceId: string): Promise<void> {
  await connectionRef(workspaceId).remove();
}

// ---------------------------------------------------------------------------
// Drive API helpers
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string,
  pageSize: number = 50,
): Promise<DriveFileList> {
  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,parents)',
  });

  if (folderId) {
    params.set('q', `'${folderId}' in parents and trashed = false`);
  } else {
    params.set('q', "trashed = false");
  }

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Drive API error: ${response.status}`);
  }

  return response.json();
}

export async function getDriveFile(
  accessToken: string,
  fileId: string,
): Promise<DriveFile> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,parents',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Drive API error: ${response.status}`);
  }

  return response.json();
}

export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentFolderId?: string,
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Drive API error: ${response.status}`);
  }

  return response.json();
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Drive API error: ${response.status}`);
  }
}

export async function getDriveAbout(
  accessToken: string,
): Promise<{ user?: { displayName?: string; emailAddress?: string }; storageQuota?: { limit?: string; usage?: string } }> {
  const params = new URLSearchParams({
    fields: 'user,storageQuota',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/about?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Drive API error: ${response.status}`);
  }

  return response.json();
}
