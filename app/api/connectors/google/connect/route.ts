// ============================================================================
// Google Ads API — Connect Route (validate + save connection)
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createGoogleAdsClient, GoogleAdsError } from '@/lib/connectors/google/client';
import { connectApp } from '@/lib/db/automation/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      clientSecret,
      refreshToken,
      developerToken,
      loginCustomerId,
      customerId,
      workspaceId,
    } = body;

    if (!clientId || !clientSecret || !refreshToken || !developerToken || !loginCustomerId || !customerId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, clientSecret, refreshToken, developerToken, loginCustomerId, customerId, workspaceId' },
        { status: 400 },
      );
    }

    // Create client with the provided credentials
    const client = createGoogleAdsClient({
      clientId,
      clientSecret,
      refreshToken,
      developerToken,
      loginCustomerId,
      customerId,
    });

    // Make a test request — query the customer to verify credentials
    try {
      await client.search('SELECT customer.id FROM customer LIMIT 1');
    } catch (err) {
      const message = err instanceof GoogleAdsError ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, status: 'error', error: `Validation failed: ${message}` },
        { status: 400 },
      );
    }

    // Save as a connected app in Firebase
    await connectApp(workspaceId, {
      id: randomUUID(),
      platform: 'google_ads',
      name: 'Google Ads',
      status: 'connected',
      config: {
        clientId,
        clientSecret,
        refreshToken,
        developerToken,
        loginCustomerId,
        customerId,
      },
      connected_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: 'connected',
      customerId,
    });
  } catch (error) {
    console.error('[google-connect] Error:', error);
    return NextResponse.json(
      { success: false, status: 'error', error: (error as Error).message },
      { status: 500 },
    );
  }
}
