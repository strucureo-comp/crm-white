// ============================================================================
// Meta Ads API — Campaigns Route (create + stats)
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { MetaClientError } from '@/lib/connectors/meta/client';
import { MetaCampaignAdapter } from '@/lib/connectors/meta/campaigns';
import type { MetaCampaignBuildInput } from '@/lib/connectors/meta/types';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST — Create a campaign (single or full hierarchy)
// Body: { accessToken, adAccountId, apiVersion, mode: 'full' | 'single', ... }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accessToken,
      adAccountId,
      apiVersion,
      mode,
      // Single campaign fields
      name,
      objective,
      budget,
      // Full campaign fields
      dailyBudgetCents,
      targeting,
      creative,
    } = body;

    if (!accessToken || !adAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: accessToken, adAccountId' },
        { status: 400 },
      );
    }

    const version = apiVersion || 'v25.0';
    const adapter = new MetaCampaignAdapter(accessToken, adAccountId, version);

    if (mode === 'full') {
      // Build full campaign hierarchy: Campaign → AdSet → AdCreative → Ad
      if (!name || !objective || !dailyBudgetCents || !targeting || !creative) {
        return NextResponse.json(
          { error: 'Missing required fields for full campaign: name, objective, dailyBudgetCents, targeting, creative' },
          { status: 400 },
        );
      }

      const input: MetaCampaignBuildInput = {
        name,
        objective,
        dailyBudgetCents,
        targeting,
        creative,
      };

      const result = await adapter.buildFullCampaign(input);
      return NextResponse.json({ success: true, result });
    } else {
      // Create a single campaign entity
      if (!name || !objective || budget === undefined) {
        return NextResponse.json(
          { error: 'Missing required fields for single campaign: name, objective, budget' },
          { status: 400 },
        );
      }

      const campaignId = await adapter.createCampaign({
        name,
        objective,
        budget,
        targeting,
        creative,
      });

      return NextResponse.json({ success: true, campaignId });
    }
  } catch (error) {
    const message = error instanceof MetaClientError ? error.message : (error as Error).message;
    console.error('[meta-campaigns] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign', details: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Retrieve campaign stats
// Query: campaignId, from, to, accessToken, adAccountId, apiVersion
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.nextUrl.searchParams.get('accessToken');
    const adAccountId = request.nextUrl.searchParams.get('adAccountId');
    const apiVersion = request.nextUrl.searchParams.get('apiVersion') || 'v25.0';
    const campaignId = request.nextUrl.searchParams.get('campaignId');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    if (!accessToken || !adAccountId || !campaignId || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required query params: accessToken, adAccountId, campaignId, from, to' },
        { status: 400 },
      );
    }

    const adapter = new MetaCampaignAdapter(accessToken, adAccountId, apiVersion);
    const stats = await adapter.getStats(campaignId, from, to);

    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof MetaClientError ? error.message : (error as Error).message;
    console.error('[meta-campaigns] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve stats', details: message },
      { status: 500 },
    );
  }
}
