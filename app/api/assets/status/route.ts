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
    try {
      const about = await getDriveAbout(connection.accessToken);
      accountInfo = about.user;
    } catch {
      // Token may be expired — try refresh
      try {
        const newAccessToken = await refreshGoogleDriveAccessToken(connection.accessToken);
        const about = await getDriveAbout(newAccessToken);
        accountInfo = about.user;
      } catch {
        // Connection may be invalid
      }
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
