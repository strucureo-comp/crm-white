// ============================================================================
// WhatsApp Cloud API — Templates Route
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppAdapter } from '@/lib/connectors/whatsapp/adapter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing required query param: workspaceId' },
        { status: 400 },
      );
    }

    const adapter = createWhatsAppAdapter();
    const templates = await adapter.listTemplates();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[whatsapp-templates] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: (error as Error).message },
      { status: 500 },
    );
  }
}
