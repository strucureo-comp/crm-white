// ============================================================================
// GET /api/assets/callback
//
// Google Drive OAuth callback. The provider redirect lands here with no
// Firebase ID token — authorization comes entirely from the signed, single-use
// `state` created by the connect route.
//
// On success, redirects to the assets page with a success indicator.
// On failure, redirects with an error message.
// ============================================================================
import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { consumeOAuthState, OAuthStateError } from '@/lib/assets/oauth-state';
import {
  exchangeGoogleDriveCode,
  upsertConnection,
  createDriveFolder,
} from '@/lib/assets/google-drive';

export const dynamic = 'force-dynamic';

function assetsUrl(req: Request, params: Record<string, string>): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, '');
  const url = new URL(`${base}/assets`);
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

export async function GET(req: Request) {
  const url = new URL(req.url);

  const providerError = url.searchParams.get('error');
  if (providerError) {
    return NextResponse.redirect(
      assetsUrl(req, {
        drive_error:
          providerError === 'access_denied'
            ? 'Authorization was cancelled. Nothing was connected.'
            : 'Google Drive declined the authorization request.',
      }),
    );
  }

  try {
    const verified = await consumeOAuthState(url.searchParams.get('state'));

    const code = url.searchParams.get('code');
    if (!code) throw new OAuthStateError('Google Drive did not return an authorization code');

    const tokens = await exchangeGoogleDriveCode(code);

    // Create a dedicated folder for this workspace's assets
    let driveFolderId: string | undefined;
    try {
      const folder = await createDriveFolder(tokens.accessToken, 'CRM Assets');
      driveFolderId = folder.id;
    } catch {
      // Non-critical: the connection still works without a dedicated folder
    }

    await upsertConnection(verified.workspaceId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      uid: verified.uid,
      email: await resolveEmail(verified.uid),
      driveFolderId,
    });

    return NextResponse.redirect(
      assetsUrl(req, { drive_connected: 'true' }),
    );
  } catch (error) {
    if (error instanceof OAuthStateError) {
      console.error('[assets:callback] state rejected');
      return NextResponse.redirect(assetsUrl(req, { drive_error: error.message }));
    }
    console.error('[assets:callback]', error);
    return NextResponse.redirect(
      assetsUrl(req, { drive_error: 'Failed to complete authorization. Please try again.' }),
    );
  }
}
