// ============================================================================
// GET /api/cron/ads-sync
//
// Background synchronization. Called by an external scheduler with
// `Authorization: Bearer ${CRON_SECRET}` — the same pattern as the billing job,
// because Netlify's `[[schedule]]` blocks do not drive Next.js API routes.
//
// Workspaces are walked in key order in bounded batches: the response carries a
// cursor so a scheduler (or the job itself, chained) can continue without ever
// loading every company at once.
// ============================================================================
import { NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebase/admin';
import { syncConnection } from '@/lib/ads/sync';
import { invalidateCampaignFeed } from '@/lib/ads/query';
import { pruneExpiredOAuthStates } from '@/lib/ads/oauth-state';
import type { AdConnection } from '@/lib/ads/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Workspaces per invocation. Keeps one run inside the function time limit. */
const DEFAULT_BATCH = 20;
const MAX_BATCH = 100;
/** A connection synced more recently than this is left alone. */
const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000;

function isDue(connection: AdConnection): boolean {
  if (connection.status === 'needs_reauth') return false;
  if (!connection.selected_account?.id) return false;
  if (!connection.last_synced_at) return true;
  const last = Date.parse(connection.last_synced_at);
  return !Number.isFinite(last) || Date.now() - last >= MIN_SYNC_INTERVAL_MS;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[ads:cron] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = new URL(req.url).searchParams;
    const batch = Math.min(MAX_BATCH, Math.max(1, Number(params.get('limit')) || DEFAULT_BATCH));
    const cursor = params.get('cursor');

    let query = getAdminDatabase().ref('ad_connections').orderByKey().limitToFirst(batch);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.once('value');
    const workspaces = (snapshot.val() as Record<string, Record<string, AdConnection>> | null) || {};
    const workspaceIds = Object.keys(workspaces);

    let attempted = 0;
    let failed = 0;
    let skipped = 0;

    for (const workspaceId of workspaceIds) {
      const connections = Object.entries(workspaces[workspaceId] || {}).map(([id, row]) => ({
        ...row,
        id,
        workspace_id: workspaceId,
      }));

      for (const connection of connections) {
        if (!isDue(connection)) {
          skipped += 1;
          continue;
        }
        // syncConnection never throws: one broken company cannot stop the job.
        const outcome = await syncConnection(workspaceId, connection);
        attempted += 1;
        if (outcome.status === 'failed') failed += 1;
      }

      invalidateCampaignFeed(workspaceId);
    }

    await pruneExpiredOAuthStates();

    return NextResponse.json({
      processed: true,
      timestamp: new Date().toISOString(),
      workspaces: workspaceIds.length,
      attempted,
      failed,
      skipped,
      // Present when there may be more workspaces after this batch.
      next_cursor: workspaceIds.length === batch ? workspaceIds[workspaceIds.length - 1] : null,
    });
  } catch (error) {
    console.error('[ads:cron] failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
