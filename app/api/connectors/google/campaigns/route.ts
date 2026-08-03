// ============================================================================
// Google Ads API — Campaigns Route (create + stats)
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsClient, GoogleAdsError } from '@/lib/connectors/google/client';
import { GoogleCampaignAdapter } from '@/lib/connectors/google/campaigns';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST — Create a full campaign hierarchy
// Body: { workspaceId, name, dailyBudgetMicros, targetUrl }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, name, dailyBudgetMicros, targetUrl } = body;

    if (!workspaceId || !name || !dailyBudgetMicros || !targetUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, name, dailyBudgetMicros, targetUrl' },
        { status: 400 },
      );
    }

    const client = createGoogleAdsClient();
    const adapter = new GoogleCampaignAdapter(client);

    const result = await adapter.createCampaign({
      name,
      dailyBudgetMicros,
      targetUrl,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof GoogleAdsError ? error.message : (error as Error).message;
    console.error('[google-campaigns] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign', details: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Retrieve campaign stats
// Query: workspaceId, campaignResourceName, from, to
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const campaignResourceName = request.nextUrl.searchParams.get('campaignResourceName');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    if (!workspaceId || !campaignResourceName || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required query params: workspaceId, campaignResourceName, from, to' },
        { status: 400 },
      );
    }

    const client = createGoogleAdsClient();
    const adapter = new GoogleCampaignAdapter(client);

    const stats = await adapter.getStats(campaignResourceName, from, to);

    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof GoogleAdsError ? error.message : (error as Error).message;
    console.error('[google-campaigns] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve stats', details: message },
      { status: 500 },
    );
  }
}
