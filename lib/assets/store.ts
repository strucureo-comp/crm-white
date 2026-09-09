// ============================================================================
// Asset persistence (server-only, Firebase Admin SDK)
//
// Assets are stored at `workspace_assets/{workspaceId}/{assetId}`.
// Tenant isolation is structural: `workspaceId` is the first path segment.
// ============================================================================
import { getAdminDatabase } from '@/lib/firebase/admin';

const ASSETS_ROOT = 'workspace_assets';

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

function assertSafeId(value: string, label: string): void {
  if (!value || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

function assetsRef(workspaceId: string) {
  return getAdminDatabase().ref(`${ASSETS_ROOT}/${workspaceId}`);
}

function assetRef(workspaceId: string, assetId: string) {
  return getAdminDatabase().ref(`${ASSETS_ROOT}/${workspaceId}/${assetId}`);
}

export async function listAssets(
  workspaceId: string,
  options?: { folder?: string; mimeTypes?: string[]; limit?: number },
): Promise<Asset[]> {
  assertSafeId(workspaceId, 'workspaceId');
  const snapshot = await assetsRef(workspaceId).orderByChild('createdAt').once('value');
  const rows = (snapshot.val() as Record<string, Asset> | null) || {};

  let assets = Object.entries(rows).map(([id, row]) => ({ ...row, id, workspaceId }));

  // Filter by folder
  if (options?.folder) {
    assets = assets.filter((a) => a.folder === options.folder);
  }

  // Filter by mime types
  if (options?.mimeTypes && options.mimeTypes.length > 0) {
    assets = assets.filter((a) => options.mimeTypes!.some((t) => a.mimeType.startsWith(t)));
  }

  // Sort newest first
  assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Limit results
  if (options?.limit) {
    assets = assets.slice(0, options.limit);
  }

  return assets;
}

export async function getAsset(
  workspaceId: string,
  assetId: string,
): Promise<Asset | null> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(assetId, 'assetId');
  const snapshot = await assetRef(workspaceId, assetId).once('value');
  if (!snapshot.exists()) return null;
  return { ...(snapshot.val() as Asset), id: assetId, workspaceId };
}

export async function createAsset(
  workspaceId: string,
  data: Omit<Asset, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
): Promise<Asset> {
  assertSafeId(workspaceId, 'workspaceId');
  const ref = assetsRef(workspaceId).push();
  const id = ref.key!;
  const now = new Date().toISOString();

  const asset: Asset = {
    ...data,
    id,
    workspaceId,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(asset);
  return asset;
}

export async function deleteAsset(
  workspaceId: string,
  assetId: string,
): Promise<void> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(assetId, 'assetId');
  await assetRef(workspaceId, assetId).remove();
}

export async function getAssetCount(workspaceId: string): Promise<number> {
  assertSafeId(workspaceId, 'workspaceId');
  const snapshot = await assetsRef(workspaceId).once('value');
  return snapshot.numChildren();
}

export async function getAssetCountByType(workspaceId: string): Promise<Record<string, number>> {
  assertSafeId(workspaceId, 'workspaceId');
  const snapshot = await assetsRef(workspaceId).once('value');
  const rows = (snapshot.val() as Record<string, Asset> | null) || {};

  const counts: Record<string, number> = {};
  for (const row of Object.values(rows)) {
    const type = row.mimeType.startsWith('image/')
      ? 'image'
      : row.mimeType.startsWith('video/')
        ? 'video'
        : row.mimeType === 'application/pdf'
          ? 'pdf'
          : 'document';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}
