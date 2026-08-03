// ============================================================================
// WhatsApp Cloud API — Fetch-based Client with Retry Logic
// ============================================================================
import type { WhatsAppConfig, WebhookError } from './types';

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------
export interface WhatsAppClient {
  get<T = unknown>(path: string, params?: Record<string, string>): Promise<T>;
  post<T = unknown>(path: string, body: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Error formatting for Meta Graph API errors
// ---------------------------------------------------------------------------
export class WhatsAppClientError extends Error {
  status: number;
  code?: number;
  fbtraceId?: string;
  type?: string;

  constructor(message: string, status: number, code?: number, type?: string, fbtraceId?: string) {
    super(message);
    this.name = 'WhatsAppClientError';
    this.status = status;
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
  }

  toString(): string {
    return `WhatsAppClientError [${this.status}${this.code ? `:${this.code}` : ''}]: ${this.message}`;
  }
}

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

function buildUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Executes a fetch request with exponential backoff retry on 429/5xx errors.
 * Returns the parsed JSON body or throws a WhatsAppClientError.
 */
async function executeWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES,
): Promise<unknown> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    lastResponse = response;

    // Read the body once as text so we can re-use it for parsing and errors
    const bodyText = await response.text();

    if (response.ok) {
      try {
        return bodyText ? JSON.parse(bodyText) : null;
      } catch {
        return bodyText;
      }
    }

    // Determine if we should retry
    const shouldRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries;
    if (shouldRetry) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    // Parse Meta Graph API error
    let errorData: { error?: WebhookError } = {};
    try {
      errorData = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // body was not JSON
    }
    const err = errorData.error;
    throw new WhatsAppClientError(
      err?.message || `WhatsApp API request failed with status ${response.status}`,
      response.status,
      err?.code,
      err?.type,
      err?.fbtrace_id,
    );
  }

  // Should not reach here, but satisfy the type checker
  throw new WhatsAppClientError(
    lastResponse ? `WhatsApp API request failed with status ${lastResponse.status}` : 'WhatsApp API request failed',
    lastResponse?.status ?? 0,
  );
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function buildWhatsAppClient(config: WhatsAppConfig): WhatsAppClient {
  const baseUrl = `https://graph.facebook.com/${config.apiVersion}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json',
  };

  return {
    async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
      const url = buildUrl(baseUrl, path, params);
      return (await executeWithRetry(url, { method: 'GET', headers })) as T;
    },

    async post<T = unknown>(path: string, body: unknown): Promise<T> {
      const url = buildUrl(baseUrl, path);
      return (
        await executeWithRetry(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      ) as T;
    },
  };
}
