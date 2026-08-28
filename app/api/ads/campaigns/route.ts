// ============================================================================
// GET /api/ads/campaigns?workspaceId=&search=&source=&status=&page=&pageSize=
//
// The Campaigns page's single data source: CRM campaigns and imported ones,
// filtered, sorted and paginated server-side. Reads only cached rows, so a page
// load never calls Meta or Google.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { getCampaignFeed, type SortKey, type SourceFilter } from '@/lib/ads/query';
import { listConnections, MANUAL_SYNC_COOLDOWN_MS } from '@/lib/ads/store';
import { isMetaConfigured } from '@/lib/ads/meta/oauth';
import { isGoogleConfigured } from '@/lib/ads/google/oauth';
import { toPublicConnection } from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

const SOURCES: SourceFilter[] = ['all', 'crm', 'meta', 'google'];
const SORTS: SortKey[] = ['name', 'status', 'budget', 'spend', 'last_synced'];

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const access = await requireWorkspaceAccess(req, params.get('workspaceId'));

    const sourceParam = params.get('source') as SourceFilter | null;
    const sortParam = params.get('sort') as SortKey | null;

    const [feed, connections] = await Promise.all([
      getCampaignFeed(access.workspaceId, {
        search: params.get('search') || undefined,
        source: sourceParam && SOURCES.includes(sourceParam) ? sourceParam : 'all',
        status: params.get('status') || 'all',
        page: Number(params.get('page')) || 1,
        pageSize: Number(params.get('pageSize')) || undefined,
        sort: sortParam && SORTS.includes(sortParam) ? sortParam : undefined,
        direction: params.get('direction') === 'desc' ? 'desc' : 'asc',
      }),
      // Connections travel with the feed so the page renders its header, the
      // account picker and the table from one request.
      listConnections(access.workspaceId).catch(() => []),
    ]);

    return NextResponse.json({
      ...feed,
      connections: connections.map((c) => toPublicConnection(c, MANUAL_SYNC_COOLDOWN_MS)),
      providers: {
        meta: { configured: isMetaConfigured() },
        google: { configured: isGoogleConfigured() },
      },
      role: access.role,
    });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[ads:campaigns:list] failed');
    return NextResponse.json({ error: 'Could not load campaigns' }, { status: 500 });
  }
}
