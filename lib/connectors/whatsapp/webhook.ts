// ============================================================================
// WhatsApp Cloud API — Webhook Verification, Signature Validation & Parsing
// ============================================================================
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  WebhookPayload,
  IncomingMessage,
  MessageStatus,
  CrmMessage,
} from './types';

export interface ParsedWebhook {
  messages: CrmMessage[];
  statuses: MessageStatus[];
}

/**
 * Verify the webhook subscription challenge during GET verification.
 * Meta sends hub.mode=subscribe, hub.verify_token=<your token>, hub.challenge=<random>.
 * Returns the challenge string to echo back, or null if verification fails.
 */
export function verifyWebhook(
  params: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string },
  verifyToken: string,
): string | null {
  const mode = params['hub.mode'];
  const token = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  if (mode && token && challenge && mode === 'subscribe' && token === verifyToken) {
    return challenge;
  }
  return null;
}

/**
 * Validate the X-Hub-Signature-256 header using HMAC SHA256.
 * The signature header has the format `sha256=<hex>`.
 */
export function validateSignature(rawBody: string, signature: string, appSecret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  const signaturePart = signature.replace(/^sha256=/, '');
  const expectedSignature = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  if (expectedSignature.length !== signaturePart.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signaturePart));
  } catch {
    return false;
  }
}

/**
 * Extract text content from various incoming message types.
 */
export function extractBody(msg: IncomingMessage): string {
  if (msg.text?.body) return msg.text.body;
  if (msg.button?.text) return msg.button.text;
  if (msg.interactive) {
    const interactive = msg.interactive;
    if (interactive.button_reply?.title) return interactive.button_reply.title;
    if (interactive.list_reply?.title) return interactive.list_reply.title;
    if (interactive.nfm_reply?.body) return interactive.nfm_reply.body;
  }
  if (msg.image?.caption) return msg.image.caption;
  if (msg.video?.caption) return msg.video.caption;
  if (msg.document?.caption) return msg.document.caption;
  if (msg.system?.body) return msg.system.body;
  if (msg.location?.name) return msg.location.name;
  return '';
}

/**
 * Parse a raw webhook payload into structured CrmMessage[] and MessageStatus[].
 */
export function parseWebhookPayload(payload: WebhookPayload): ParsedWebhook {
  const messages: CrmMessage[] = [];
  const statuses: MessageStatus[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const displayPhoneNumber = value.metadata?.display_phone_number || value.metadata?.phone_number_id || '';

      // Build contact lookup map
      const contactNames = new Map<string, string>();
      for (const contact of value.contacts || []) {
        if (contact.wa_id) {
          contactNames.set(contact.wa_id, contact.profile?.name || contact.wa_id);
        }
      }

      // Parse incoming messages
      for (const msg of value.messages || []) {
        const timestampMs = parseInt(msg.timestamp, 10) * 1000;
        messages.push({
          platform: 'whatsapp',
          messageId: msg.id,
          from: msg.from,
          to: displayPhoneNumber,
          body: extractBody(msg),
          type: msg.type,
          timestamp: new Date(isNaN(timestampMs) ? Date.now() : timestampMs),
          rawPayload: msg,
        });
      }

      // Parse status updates
      if (value.statuses) {
        statuses.push(...value.statuses);
      }
    }
  }

  return { messages, statuses };
}
