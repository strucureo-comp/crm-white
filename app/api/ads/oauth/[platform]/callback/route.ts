// ============================================================================
// GET /api/ads/oauth/[platform]/callback
//
// The provider redirect lands here. There is no Firebase ID token on this
// request, so authorization comes entirely from the signed, single-use `state`
// created by the start route — that is what binds the grant to one company.
//
// Every outcome ends in a redirect back to the Campaigns page: a failed
// authorization must never render a raw error, and never echo the provider's
// response body (it can contain the authorization code or the app secret).
// ============================================================================
import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { consumeOAuthState, OAuthStateError } from '@/lib/ads/oauth-state';
import { classifyAdError } from '@/lib/ads/errors';
import { upsertConnection } from '@/lib/ads/store';
import { exchangeMetaCode, listMetaAdAccounts } from '@/lib/ads/meta/oauth';
import { exchangeGoogleCode, listGoogleAdAccounts } from '@/lib/ads/google/oauth';
import { invalidateCampaignFeed } from '@/lib/ads/query';
import { isAdPlatform, type AdAccountRef, type AdPlatform } from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

function campaignsUrl(req: Request, params: Record<string, string>): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, '');
  const url = new URL(`${base}/campaigns`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

async function resolveEmail(uid: string): Promise<string | undefined> {
  try {
    const user = await getAdminAuth().getUser(uid);
    return user.email ?? undefined;
  } catch {
    return undefined;
  }
}

interface Exchanged {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
  accounts: AdAccountRef[];
}

async function exchange(platform: AdPlatform, code: string): Promise<Exchanged> {
  if (platform === 'meta') {
    const tokens = await exchangeMetaCode(code);
    return {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      accounts: await listMetaAdAccounts(tokens.accessToken),
    };
  }

  const tokens = await exchangeGoogleCode(code);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes,
    accounts: await listGoogleAdAccounts(tokens.accessToken),
  };
}

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const url = new URL(req.url);
  const platformParam = params.platform;

  if (!isAdPlatform(platformParam)) {
    return NextResponse.redirect(campaignsUrl(req, { ads_error: 'Unknown ad platform' }));
  }

  // The user declined, or the provider rejected the request.
  const providerError = url.searchParams.get('error');
  if (providerError) {
    return NextResponse.redirect(
      campaignsUrl(req, {
        ads_error:
          providerError === 'access_denied'
            ? 'Authorization was cancelled. Nothing was connected.'
            : 'The ad platform declined the authorization request.',
      }),
    );
  }

  try {
    const verified = await consumeOAuthState(url.searchParams.get('state'));
    if (verified.platform !== platformParam) {
      throw new OAuthStateError('Authorization state failed verification');
    }

    const code = url.searchParams.get('code');
    if (!code) throw new OAuthStateError('The ad platform did not return an authorization code');

    const result = await exchange(verified.platform, code);

    if (result.accounts.length === 0) {
      await upsertConnection(verified.workspaceId, {
        platform: verified.platform,
        status: 'pending_account_selection',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessTokenExpiresAt: result.expiresAt,
        scopes: result.scopes,
        availableAccounts: [],
        selectedAccount: null,
        uid: verified.uid,
        email: await resolveEmail(verified.uid),
      });
      return NextResponse.redirect(
        campaignsUrl(req, {
          ads_error:
            'That account has no ad accounts we can read. Check the permissions and try again.',
        }),
      );
    }

    // A single account needs no picker — select it so the first sync can run.
    const auto = result.accounts.length === 1 ? result.accounts[0] : null;

    const connection = await upsertConnection(verified.workspaceId, {
      platform: verified.platform,
      status: auto ? 'connected' : 'pending_account_selection',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpiresAt: result.expiresAt,
      scopes: result.scopes,
      availableAccounts: result.accounts,
      selectedAccount: auto,
      uid: verified.uid,
      email: await resolveEmail(verified.uid),
    });

    invalidateCampaignFeed(verified.workspaceId);

    // The page triggers the first sync itself, so this redirect stays fast and
    // the import is not tied to the provider's redirect timing out.
    return NextResponse.redirect(
      campaignsUrl(req, {
        ads_connected: verified.platform,
        ...(auto ? { ads_sync: connection.id } : { ads_select: connection.id }),
      }),
    );
  } catch (error) {
    if (error instanceof OAuthStateError) {
      console.error('[ads:oauth:callback] state rejected');
      return NextResponse.redirect(campaignsUrl(req, { ads_error: error.message }));
    }
    const classified = classifyAdError(error);
    console.error(`[ads:oauth:callback] kind=${classified.kind}`);
    return NextResponse.redirect(campaignsUrl(req, { ads_error: classified.message }));
  }
}
