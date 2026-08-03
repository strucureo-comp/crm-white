// ============================================================================
// WhatsApp Cloud API — Message Sending Functions
// ============================================================================
import type { WhatsAppClient } from './client';
import type {
  WhatsAppConfig,
  SendMessageRequest,
  SendMessageResponse,
  TemplateMessage,
  CrmMessage,
} from './types';

/**
 * Send a message via the WhatsApp Cloud API.
 * POST to /${phoneNumberId}/messages
 */
export async function sendMessage(
  client: WhatsAppClient,
  config: WhatsAppConfig,
  payload: SendMessageRequest,
): Promise<SendMessageResponse> {
  return client.post<SendMessageResponse>(`/${config.phoneNumberId}/messages`, payload);
}

/**
 * Send a plain text message and return a CrmMessage record.
 */
export async function sendTextMessage(
  client: WhatsAppClient,
  config: WhatsAppConfig,
  to: string,
  body: string,
): Promise<CrmMessage> {
  const response = await sendMessage(client, config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body, preview_url: false },
  });

  const messageId = response.messages?.[0]?.id ?? '';
  return {
    platform: 'whatsapp',
    messageId,
    from: config.phoneNumberId,
    to,
    body,
    type: 'text',
    timestamp: new Date(),
    status: 'sent',
    rawPayload: response,
  };
}

/**
 * Send a template message.
 */
export async function sendTemplateMessage(
  client: WhatsAppClient,
  config: WhatsAppConfig,
  to: string,
  template: TemplateMessage['template'],
): Promise<SendMessageResponse> {
  return sendMessage(client, config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template,
  });
}

/**
 * Mark an incoming message as read (blue ticks).
 * POST to /${phoneNumberId}/messages with messaging_product=react mark_as_read
 */
export async function markMessageRead(
  client: WhatsAppClient,
  config: WhatsAppConfig,
  messageId: string,
): Promise<unknown> {
  return client.post(`/${config.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}
