// ============================================================================
// POST /api/ads/sync
//
// Manual refresh. Rate limited per connection through a timestamp stored in the
// database, so the cooldown holds across server instances rather than per
// process, and serialised against the background job by the sync lock.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireManageRole,
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { manualSync, SyncRateLimitError } from '@/lib/ads/sync';
import { invalidateCampaignFeed } from '@/lib/ads/query';

export const dynamic = 'force-dynamic';
/** A two-platform sync can take a while; keep well inside the platform limit. */
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      workspaceId?: string;
      connectionId?: string;
    };
    const access = await requireWorkspaceAccess(req, body.workspaceId);
    requireManageRole(access);

    const outcomes = await manualSync(access.workspaceId, body.connectionId);
    invalidateCampaignFeed(access.workspaceId);

    return NextResponse.json({
      synced: outcomes.filter((o) => !o.skipped).length,
      outcomes,
    });
  } catch (error) {
    if (error instanceof SyncRateLimitError) {
      return NextResponse.json(
        { error: error.message, code: 'rate_limited', retry_after: error.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } },
      );
    }
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[ads:sync] failed');
    return NextResponse.json({ error: 'Sync could not be started' }, { status: 500 });
  }
}
