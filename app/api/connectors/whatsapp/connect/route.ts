// ============================================================================
// WhatsApp Cloud API — Connect Route (validate + save connection)
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createWhatsAppAdapter } from '@/lib/connectors/whatsapp/adapter';
import { connectApp } from '@/lib/db/automation/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumberId,
      wabaId,
      accessToken,
      verifyToken,
      appId,
      appSecret,
      workspaceId,
    } = body;

    if (!phoneNumberId || !wabaId || !accessToken || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumberId, wabaId, accessToken, workspaceId' },
        { status: 400 },
      );
    }

    // Create adapter with the provided overrides
    const adapter = createWhatsAppAdapter({
      phoneNumberId,
      wabaId,
      accessToken,
      verifyToken,
      appId,
      appSecret,
    });

    // Validate by fetching phone number info
    const isValid = await adapter.validate();
    if (!isValid) {
      return NextResponse.json(
        { success: false, status: 'error', error: 'Validation failed' },
        { status: 400 },
      );
    }

    // Fetch phone number info for the display number
    const info = await adapter.getPhoneNumberInfo();

    // Save as a connected app in Firebase
    await connectApp(workspaceId, {
      id: randomUUID(),
      platform: 'whatsapp',
      name: 'WhatsApp',
      status: 'connected',
      config: {
        phoneNumberId,
        wabaId,
        verifyToken,
        appId,
        apiVersion: process.env.META_WA_API_VERSION || 'v21.0',
        displayPhoneNumber: info.display_phone_number,
      },
      api_key: accessToken,
      connected_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: 'connected',
      phoneNumber: info.display_phone_number,
    });
  } catch (error) {
    console.error('[whatsapp-connect] Error:', error);
    return NextResponse.json(
      { success: false, status: 'error', error: (error as Error).message },
      { status: 500 },
    );
  }
}
