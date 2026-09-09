// ============================================================================
// GET    /api/assets/[id]?workspaceId=...
// DELETE /api/assets/[id]?workspaceId=...
//
// Retrieves or deletes a single asset. The workspace ID is validated
// server-side against the authenticated user's membership.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import {
  getConnection,
  refreshGoogleDriveAccessToken,
  getDriveFile,
  deleteDriveFile,
} from '@/lib/assets/google-drive';
import { getAsset, deleteAsset } from '@/lib/assets/store';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET — retrieve single asset
// ---------------------------------------------------------------------------
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const asset = await getAsset(access.workspaceId, params.id);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:get]', error);
    return NextResponse.json({ error: 'Failed to get asset' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — remove asset from Drive + database
// ---------------------------------------------------------------------------
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const asset = await getAsset(access.workspaceId, params.id);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get connection for Drive API access
    const connection = await getConnection(access.workspaceId);
    if (connection) {
      // Try to delete from Drive (best-effort)
      let accessToken = connection.accessToken;
      try {
        if (connection.accessTokenExpiresAt && Date.now() > connection.accessTokenExpiresAt) {
          accessToken = await refreshGoogleDriveAccessToken(connection.refreshToken);
        }
        await deleteDriveFile(accessToken, asset.driveFileId);
      } catch {
        // Drive deletion failed — still remove from database
        console.warn('[assets:delete] Failed to delete from Drive:', asset.driveFileId);
      }
    }

    // Remove from database
    await deleteAsset(access.workspaceId, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:delete]', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
