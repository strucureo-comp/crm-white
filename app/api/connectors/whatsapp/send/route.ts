// ============================================================================
// WhatsApp Cloud API — Send Message Route
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppAdapter } from '@/lib/connectors/whatsapp/adapter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, company_id } = body as { to?: string; message?: string; company_id?: string };

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 },
      );
    }

    const adapter = createWhatsAppAdapter();
    const result = await adapter.sendText(to, message);

    // Store outgoing message in Firebase
    try {
      const { database } = await import('@/lib/firebase/config');
      const { ref, set } = await import('firebase/database');
      await set(ref(database, `whatsapp_messages/${result.messageId}`), {
        platform: 'whatsapp',
        messageId: result.messageId,
        from: '',
        to,
        body: message,
        type: 'text',
        company_id: company_id || '',
        direction: 'outgoing',
        status: 'sent',
        timestamp: new Date().toISOString(),
      });
    } catch (storeErr) {
      console.error('[whatsapp-send] Failed to store outgoing message:', storeErr);
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('[whatsapp-send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: (error as Error).message },
      { status: 500 },
    );
  }
}
