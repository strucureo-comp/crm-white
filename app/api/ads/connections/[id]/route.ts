// ============================================================================
// DELETE /api/ads/connections/[id]?workspaceId=...
//
// Disconnects a platform: revokes the grant with the provider on a best-effort
// basis, then deletes the stored credential and every campaign it imported.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireManageRole,
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { decryptSecret } from '@/lib/ads/crypto';
import { deleteConnection, getConnection } from '@/lib/ads/store';
import { revokeMetaAccess } from '@/lib/ads/meta/oauth';
import { revokeGoogleAccess } from '@/lib/ads/google/oauth';
import { invalidateCampaignFeed } from '@/lib/ads/query';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);
    requireManageRole(access);

    const connection = await getConnection(access.workspaceId, params.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Revocation is best-effort: the local credential is removed either way, so a
    // provider outage cannot leave the company unable to disconnect.
    try {
      if (connection.platform === 'meta' && connection.access_token_enc) {
        await revokeMetaAccess(decryptSecret(connection.access_token_enc));
      } else if (connection.platform === 'google' && connection.refresh_token_enc) {
        await revokeGoogleAccess(decryptSecret(connection.refresh_token_enc));
      }
    } catch {
      console.warn(`[ads:disconnect] revocation failed for ${connection.platform}`);
    }

    await deleteConnection(access.workspaceId, params.id);
    invalidateCampaignFeed(access.workspaceId);

    return NextResponse.json({ disconnected: true, platform: connection.platform });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[ads:disconnect] failed');
    return NextResponse.json({ error: 'Could not disconnect this account' }, { status: 500 });
  }
}
