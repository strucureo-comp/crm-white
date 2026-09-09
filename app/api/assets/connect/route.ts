// ============================================================================
// GET /api/assets/connect?workspaceId=...
//
// Returns the Google Drive consent URL for the caller's workspace.
// The URL carries a signed, single-use, workspace-bound `state`.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireManageRole,
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { createOAuthState } from '@/lib/assets/oauth-state';
import { buildGoogleDriveAuthUrl, isGoogleDriveConfigured } from '@/lib/assets/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);
    requireManageRole(access);

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          error: 'Google Drive is not configured on this server yet. Ask an administrator to add the app credentials.',
          code: 'not_configured',
        },
        { status: 503 },
      );
    }

    const state = await createOAuthState(access.workspaceId, access.uid);
    const url = buildGoogleDriveAuthUrl(state);

    return NextResponse.json({ url });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:connect]', error);
    return NextResponse.json({ error: 'Failed to start authorization' }, { status: 500 });
  }
}
