// ============================================================================
// GET /api/ads/oauth/[platform]/start?workspaceId=...
//
// Returns the provider consent URL for the caller's company. The URL is built
// server-side and carries a signed, single-use, workspace-bound `state`, so a
// callback can only ever be applied to the company that started the flow.
//
// The client fetches this with its Firebase ID token and then navigates to the
// returned URL — a plain browser redirect could not carry the token.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireManageRole,
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import { createOAuthState } from '@/lib/ads/oauth-state';
import { buildMetaAuthUrl, isMetaConfigured } from '@/lib/ads/meta/oauth';
import { buildGoogleAuthUrl, isGoogleConfigured } from '@/lib/ads/google/oauth';
import { classifyAdError } from '@/lib/ads/errors';
import { isAdPlatform, PLATFORM_LABELS } from '@/lib/ads/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  try {
    const platform = params.platform;
    if (!isAdPlatform(platform)) {
      return NextResponse.json({ error: 'Unknown ad platform' }, { status: 404 });
    }

    const searchParams = new URL(req.url).searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const returnTo = searchParams.get('returnTo') || undefined;
    const access = await requireWorkspaceAccess(req, workspaceId);
    requireManageRole(access);

    const configured = platform === 'meta' ? isMetaConfigured() : isGoogleConfigured();
    if (!configured) {
      return NextResponse.json(
        {
          error: `${PLATFORM_LABELS[platform]} is not configured on this server yet. Ask an administrator to add the app credentials.`,
          code: 'not_configured',
        },
        { status: 503 },
      );
    }

    const state = await createOAuthState(platform, access.workspaceId, access.uid, returnTo);
    const url = platform === 'meta' ? buildMetaAuthUrl(state) : buildGoogleAuthUrl(state);

    return NextResponse.json({ url });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    // Never echo the provider/config error verbatim: it can contain credentials.
    const classified = classifyAdError(error);
    console.error(`[ads:oauth:start] kind=${classified.kind}`);
    return NextResponse.json({ error: classified.message }, { status: 500 });
  }
}
