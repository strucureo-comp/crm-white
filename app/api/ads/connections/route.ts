// ============================================================================
// GET /api/ads/connections?workspaceId=...
//
// Returns the company's ad platform connections with every secret stripped, plus
// whether each provider is configured on the server at all.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { listConnections, MANUAL_SYNC_COOLDOWN_MS } from '@/lib/ads/store';
import { isMetaConfigured } from '@/lib/ads/meta/oauth';
import { isGoogleConfigured } from '@/lib/ads/google/oauth';
import { toPublicConnection } from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const connections = await listConnections(access.workspaceId);

    return NextResponse.json({
      connections: connections.map((c) => toPublicConnection(c, MANUAL_SYNC_COOLDOWN_MS)),
      providers: {
        meta: { configured: isMetaConfigured() },
        google: { configured: isGoogleConfigured() },
      },
      cooldown_seconds: Math.ceil(MANUAL_SYNC_COOLDOWN_MS / 1000),
      role: access.role,
    });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[ads:connections:list] failed');
    return NextResponse.json({ error: 'Could not load ad connections' }, { status: 500 });
  }
}
