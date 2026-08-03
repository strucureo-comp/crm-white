// ============================================================================
// Meta Ads API — Connect Route (validate + save connection)
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createMetaClient, MetaClientError } from '@/lib/connectors/meta/client';
import { connectApp } from '@/lib/db/automation/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, adAccountId, apiVersion, workspaceId } = body;

    if (!accessToken || !adAccountId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: accessToken, adAccountId, workspaceId' },
        { status: 400 },
      );
    }

    const version = apiVersion || 'v25.0';

    // Create client with the provided credentials
    const client = createMetaClient({
      accessToken,
      adAccountId,
      apiVersion: version,
    });

    // Make a test request to verify the ad account
    try {
      await client.get(`/${adAccountId}`, {
        fields: 'id,account_id,name,currency,account_status',
      });
    } catch (err) {
      const message = err instanceof MetaClientError ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, status: 'error', error: `Validation failed: ${message}` },
        { status: 400 },
      );
    }

    // Save as a connected app in Firebase
    await connectApp(workspaceId, {
      id: randomUUID(),
      platform: 'meta_ads',
      name: 'Meta Ads',
      status: 'connected',
      config: {
        adAccountId,
        apiVersion: version,
      },
      api_key: accessToken,
      connected_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: 'connected',
      adAccountId,
    });
  } catch (error) {
    console.error('[meta-connect] Error:', error);
    return NextResponse.json(
      { success: false, status: 'error', error: (error as Error).message },
      { status: 500 },
    );
  }
}
