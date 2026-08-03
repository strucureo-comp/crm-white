// ============================================================================
// WhatsApp Cloud API — Adapter (high-level operations)
// ============================================================================
import { buildWhatsAppClient, type WhatsAppClient } from './client';
import {
  sendTextMessage,
  sendTemplateMessage,
  markMessageRead,
} from './messages';
import type {
  WhatsAppConfig,
  PhoneNumberInfo,
  WabaInfo,
  MessageTemplate,
  TemplateListResponse,
  SendMessageResponse,
  TemplateMessage,
  CrmMessage,
} from './types';

export class WhatsAppAdapter {
  protected config: WhatsAppConfig;
  protected client: WhatsAppClient;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.client = buildWhatsAppClient(config);
  }

  /**
   * Validate the connection by fetching phone number info.
   * Returns true if the phone number is verified/connected.
   */
  async validate(): Promise<boolean> {
    try {
      const info = await this.getPhoneNumberInfo();
      return Boolean(info && info.id);
    } catch {
      return false;
    }
  }

  /** Fetch details about the registered phone number. */
  async getPhoneNumberInfo(): Promise<PhoneNumberInfo> {
    return this.client.get<PhoneNumberInfo>(`/${this.config.phoneNumberId}`, {
      fields: 'verified_name,display_phone_number,id,quality_rating,status,messaging_limit_tier',
    });
  }

  /** Fetch WhatsApp Business Account (WABA) info. */
  async getWabaInfo(): Promise<WabaInfo> {
    return this.client.get<WabaInfo>(`/${this.config.wabaId}`, {
      fields: 'id,name,message_template_namespace,timezone,on_behalf_of_business',
    });
  }

  /** List all message templates for the WABA. */
  async listTemplates(): Promise<MessageTemplate[]> {
    const response = await this.client.get<TemplateListResponse>(
      `/${this.config.wabaId}/message_templates`,
    );
    return response.data || [];
  }

  /** Send a text message. Returns a CrmMessage record. */
  async sendText(to: string, body: string): Promise<CrmMessage> {
    return sendTextMessage(this.client, this.config, to, body);
  }

  /** Send a template message. */
  async sendTemplate(to: string, template: TemplateMessage['template']): Promise<SendMessageResponse> {
    return sendTemplateMessage(this.client, this.config, to, template);
  }

  /** Mark an incoming message as read. */
  async markRead(messageId: string): Promise<void> {
    await markMessageRead(this.client, this.config, messageId);
  }
}

/**
 * Factory: create a WhatsAppAdapter from environment variables, with optional overrides.
 *
 * Env vars:
 *  - META_WA_PHONE_NUMBER_ID
 *  - META_WABA_ID
 *  - META_WA_ACCESS_TOKEN
 *  - META_WA_WEBHOOK_VERIFY_TOKEN
 *  - META_WA_API_VERSION (default: v21.0)
 *  - META_APP_ID
 *  - META_APP_SECRET
 */
export function createWhatsAppAdapter(overrides: Partial<WhatsAppConfig> = {}): WhatsAppAdapter {
  const config: WhatsAppConfig = {
    phoneNumberId: overrides.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID || '',
    wabaId: overrides.wabaId || process.env.META_WABA_ID || '',
    accessToken: overrides.accessToken || process.env.META_WA_ACCESS_TOKEN || '',
    verifyToken: overrides.verifyToken || process.env.META_WA_WEBHOOK_VERIFY_TOKEN || '',
    apiVersion: overrides.apiVersion || process.env.META_WA_API_VERSION || 'v21.0',
    appId: overrides.appId || process.env.META_APP_ID || '',
    appSecret: overrides.appSecret || process.env.META_APP_SECRET || '',
  };
  return new WhatsAppAdapter(config);
}
