// ============================================================================
// DELETE /api/assets/disconnect?workspaceId=...
//
// Disconnects Google Drive for the caller's workspace.
// Revokes the refresh token and removes the connection record.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireManageRole,
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import {
  getConnection,
  deleteConnection,
  revokeGoogleDriveAccess,
} from '@/lib/assets/google-drive';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);
    requireManageRole(access);

    const connection = await getConnection(access.workspaceId);

    if (connection) {
      // Best-effort token revocation
      await revokeGoogleDriveAccess(connection.refreshToken);
      await deleteConnection(access.workspaceId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:disconnect]', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
