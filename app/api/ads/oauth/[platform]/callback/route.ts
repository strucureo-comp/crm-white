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
import { exchangeMetaCode, listMetaAdAccounts, listMetaPages, type MetaPageRef } from '@/lib/ads/meta/oauth';
import { exchangeGoogleCode, listGoogleAdAccounts } from '@/lib/ads/google/oauth';
import { invalidateCampaignFeed } from '@/lib/ads/query';
import { isAdPlatform, type AdAccountRef, type AdPlatform } from '@/lib/ads/types';
import { getAdminDatabase } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function buildRedirectUrl(
  req: Request,
  basePath: string,
  params: Record<string, string>,
): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, '');
  const url = new URL(`${origin}${basePath}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function campaignsUrl(req: Request, params: Record<string, string>): string {
  return buildRedirectUrl(req, '/campaigns', params);
}

function returnUrl(req: Request, returnTo: string | undefined, params: Record<string, string>): string {
  const safePath = returnTo && /^\/[a-zA-Z0-9/_-]*$/.test(returnTo) ? returnTo : '/campaigns';
  return buildRedirectUrl(req, safePath, params);
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
  pages?: MetaPageRef[];
}

async function exchange(platform: AdPlatform, code: string): Promise<Exchanged> {
  if (platform === 'meta') {
    const tokens = await exchangeMetaCode(code);
    return {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      accounts: await listMetaAdAccounts(tokens.accessToken),
      pages: await listMetaPages(tokens.accessToken).catch(() => []),
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

    if (verified.platform === 'meta' && result.pages && result.pages.length > 0) {
      const socialRef = getAdminDatabase().ref(`social_accounts/${verified.workspaceId}`);
      for (const page of result.pages) {
        // Find existing or create new
        const snapshot = await socialRef.orderByChild('platform').equalTo('facebook').once('value');
        const existing = snapshot.val();
        let existingId = null;
        if (existing) {
          existingId = Object.keys(existing).find(key => existing[key].externalAccountId === page.id);
        }
        
        const accountData = {
          platform: 'facebook',
          connected: true,
          handle: page.name,
          externalAccountId: page.id,
          followers: 0,
          engagement: 0,
          postsThisMonth: 0,
          impressions: 0,
          growth: 0,
        };

        if (existingId) {
          await socialRef.child(existingId).update(accountData);
        } else {
          // Check if there is an offline facebook placeholder we can overwrite
          let placeholderId = null;
          if (existing) {
             placeholderId = Object.keys(existing).find(key => existing[key].connected === false);
          }
          if (placeholderId) {
             await socialRef.child(placeholderId).update(accountData);
          } else {
             await socialRef.push(accountData);
          }
        }
        
        // Connect Instagram if linked to page
        if (page.instagram_business_account?.id) {
          const igData = {
            platform: 'instagram',
            connected: true,
            handle: page.instagram_business_account.username || 'Instagram Account',
            externalAccountId: page.instagram_business_account.id,
            followers: 0,
            engagement: 0,
            postsThisMonth: 0,
            impressions: 0,
            growth: 0,
          };
          
          const igSnapshot = await socialRef.orderByChild('platform').equalTo('instagram').once('value');
          const igExisting = igSnapshot.val();
          let igExistingId = null;
          if (igExisting) {
            igExistingId = Object.keys(igExisting).find(key => igExisting[key].externalAccountId === page.instagram_business_account?.id);
          }
          if (igExistingId) {
            await socialRef.child(igExistingId).update(igData);
          } else {
            let igPlaceholderId = null;
            if (igExisting) {
               igPlaceholderId = Object.keys(igExisting).find(key => igExisting[key].connected === false);
            }
            if (igPlaceholderId) {
               await socialRef.child(igPlaceholderId).update(igData);
            } else {
               await socialRef.push(igData);
            }
          }
        }
      }
    }

    invalidateCampaignFeed(verified.workspaceId);

    // Redirect to returnTo (e.g. /social) if specified, otherwise /campaigns.
    // The page triggers the first sync itself, so this redirect stays fast.
    return NextResponse.redirect(
      returnUrl(req, verified.returnTo, {
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
