// ============================================================================
// WhatsApp Cloud API — Webhook Route (verification + incoming messages)
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, validateSignature, parseWebhookPayload } from '@/lib/connectors/whatsapp/webhook';
import type { WebhookPayload } from '@/lib/connectors/whatsapp/types';
import { getAdminDatabase } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET — Webhook verification (Meta subscription challenge)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const params = {
    'hub.mode': request.nextUrl.searchParams.get('hub.mode') || undefined,
    'hub.verify_token': request.nextUrl.searchParams.get('hub.verify_token') || undefined,
    'hub.challenge': request.nextUrl.searchParams.get('hub.challenge') || undefined,
  };

  const verifyToken = process.env.META_WA_WEBHOOK_VERIFY_TOKEN || '';
  const challenge = verifyWebhook(params as Record<string, string>, verifyToken);

  if (challenge !== null) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Incoming webhook (messages + status updates)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // Read raw body as text for signature verification
  const rawBody = await request.text();

  // Validate X-Hub-Signature-256 in production
  const isProduction = process.env.NODE_ENV === 'production';
  const appSecret = process.env.META_APP_SECRET || '';
  const signature = request.headers.get('x-hub-signature-256') || '';

  if (isProduction && appSecret) {
    if (!validateSignature(rawBody, signature, appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // Parse JSON body
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Parse into structured messages + statuses
  const parsed = parseWebhookPayload(payload);

  // Find workspaceId from connected apps by matching phone_number_id
  let workspaceId = '';
  let companyId = '';
  try {
    const db = getAdminDatabase();
    const phoneNumberOf = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || '';
    if (phoneNumberOf) {
      // Search all workspaces for a connected whatsapp app with this phone_number_id
      const workspacesSnap = await db.ref('workspaces').once('value');
      const workspaces = workspacesSnap.val() || {};
      for (const [wsId, wsData] of Object.entries(workspaces)) {
        const appsSnap = await db.ref(`workspaces/${wsId}/connected_apps`).once('value');
        const apps = appsSnap.val() || {};
        for (const app of Object.values(apps) as any[]) {
          if (app.platform === 'whatsapp' && app.config?.phoneNumberId === phoneNumberOf) {
            workspaceId = wsId;
            // Get workspace_id from workspace-scoped companies table
            const companiesSnap = await db.ref(`workspaces/${wsId}/companies`).once('value');
            const companies = companiesSnap.val() || {};
            const firstCompany = Object.values(companies)[0] as any;
            if (firstCompany?.id) {
              companyId = firstCompany.id;
            }
            break;
          }
        }
        if (workspaceId) break;
      }
    }
  } catch (err) {
    console.error('[whatsapp-webhook] Failed to lookup workspace_id:', err);
  }

  // Store each incoming message in Firebase Realtime Database
  // Respond 200 immediately so Meta doesn't retry
  if (parsed.messages.length > 0 && workspaceId) {
    try {
      const db = getAdminDatabase();
      const writes = parsed.messages.map((msg) =>
        db.ref(`workspaces/${workspaceId}/whatsapp_messages/${msg.messageId}`).set({
          ...msg,
          workspace_id: companyId,
          direction: 'incoming',
          timestamp: msg.timestamp.toISOString(),
        }),
      );
      await Promise.all(writes);
    } catch (err) {
      // Fall back to client SDK if admin is unavailable
      console.error('[whatsapp-webhook] Failed to store messages via admin SDK:', err);
      try {
        const { database } = await import('@/lib/firebase/config');
        const { ref, set } = await import('firebase/database');
        const fallbackWrites = parsed.messages.map((msg) =>
          set(ref(database, `workspaces/${workspaceId}/whatsapp_messages/${msg.messageId}`), {
            ...msg,
            workspace_id: companyId,
            direction: 'incoming',
            timestamp: msg.timestamp.toISOString(),
          }),
        );
        await Promise.all(fallbackWrites);
      } catch (fallbackErr) {
        console.error('[whatsapp-webhook] Client SDK fallback also failed:', fallbackErr);
      }
    }
  }

  // Always respond 200 immediately
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
