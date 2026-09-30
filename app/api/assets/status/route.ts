// ============================================================================
// GET /api/assets/status?workspaceId=...
//
// Returns the Google Drive connection status for the caller's workspace.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { getConnection, getDriveAbout, refreshGoogleDriveAccessToken } from '@/lib/assets/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const connection = await getConnection(access.workspaceId);

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Try to get account info if token is valid
    let accountInfo: { displayName?: string; emailAddress?: string } | undefined;
    let isConnected = true;

    try {
      const about = await getDriveAbout(connection.accessToken);
      accountInfo = about.user;
    } catch {
      // Token may be expired — try refresh
      try {
        const newAccessToken = await refreshGoogleDriveAccessToken(connection.refreshToken);
        const about = await getDriveAbout(newAccessToken);
        accountInfo = about.user;
        
        // Update the refreshed access token in the DB
        const { upsertConnection } = await import('@/lib/assets/google-drive');
        await upsertConnection(access.workspaceId, {
          accessToken: newAccessToken,
          refreshToken: connection.refreshToken,
          scopes: connection.scopes,
          uid: connection.uid,
          email: connection.email,
          driveFolderId: connection.driveFolderId,
        });
      } catch (err) {
        // Connection may be invalid or revoked
        isConnected = false;
        const { deleteConnection } = await import('@/lib/assets/google-drive');
        await deleteConnection(access.workspaceId);
      }
    }

    if (!isConnected) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: connection.email || accountInfo?.emailAddress,
      displayName: accountInfo?.displayName,
      connectedAt: connection.connectedAt,
      driveFolderId: connection.driveFolderId,
    });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:status]', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
