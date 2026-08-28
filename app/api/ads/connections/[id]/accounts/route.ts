// ============================================================================
// /api/ads/connections/[id]/accounts
//
//   GET  — re-reads the ad accounts the stored grant can see
//   POST — selects the account to sync, then imports it immediately
//
// Both require workspace membership; POST additionally requires a role that may
// change integration state.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireManageRole,
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { decryptSecret } from '@/lib/ads/crypto';
import { logAdError } from '@/lib/ads/errors';
import { getConnection, setSelectedAccount, updateSyncState } from '@/lib/ads/store';
import { listMetaAdAccounts } from '@/lib/ads/meta/oauth';
import { listGoogleAdAccounts, refreshGoogleAccessToken } from '@/lib/ads/google/oauth';
import { invalidateCampaignFeed } from '@/lib/ads/query';
import { syncConnection } from '@/lib/ads/sync';
import type { AdAccountRef, AdConnection } from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

/** Reads the account list for a connection using its stored credential. */
async function readAccounts(connection: AdConnection): Promise<AdAccountRef[]> {
  if (connection.platform === 'meta') {
    if (!connection.access_token_enc) return [];
    return listMetaAdAccounts(decryptSecret(connection.access_token_enc));
  }
  if (!connection.refresh_token_enc) return [];
  const accessToken = await refreshGoogleAccessToken(decryptSecret(connection.refresh_token_enc));
  return listGoogleAdAccounts(accessToken);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const connection = await getConnection(access.workspaceId, params.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    try {
      const accounts = await readAccounts(connection);
      await updateSyncState(access.workspaceId, connection.id, { availableAccounts: accounts });
      return NextResponse.json({ accounts });
    } catch (error) {
      const classified = logAdError(`accounts:${connection.platform}`, error);
      if (classified.needsReauth) {
        await updateSyncState(access.workspaceId, connection.id, {
          status: 'needs_reauth',
          lastError: classified.message,
        });
      }
      // Fall back to the list cached at connect time so the picker still works.
      return NextResponse.json(
        { accounts: connection.available_accounts ?? [], warning: classified.message },
        { status: 200 },
      );
    }
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[ads:accounts:list] failed');
    return NextResponse.json({ error: 'Could not load ad accounts' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      workspaceId?: string;
      accountId?: string;
    };
    const access = await requireWorkspaceAccess(req, body.workspaceId);
    requireManageRole(access);

    const connection = await getConnection(access.workspaceId, params.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // The account must be one the grant actually returned; a caller cannot name
    // an arbitrary ad account id and have the server sync it.
    const account = (connection.available_accounts ?? []).find((a) => a.id === body.accountId);
    if (!account) {
      return NextResponse.json(
        { error: 'That ad account is not available on this connection' },
        { status: 400 },
      );
    }

    await setSelectedAccount(access.workspaceId, connection.id, account);
    const outcome = await syncConnection(access.workspaceId, {
      ...connection,
      selected_account: account,
      status: 'connected',
    });
    invalidateCampaignFeed(access.workspaceId);

    return NextResponse.json({ selected_account: account, sync: outcome });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[ads:accounts:select] failed');
    return NextResponse.json({ error: 'Could not select this ad account' }, { status: 500 });
  }
}
