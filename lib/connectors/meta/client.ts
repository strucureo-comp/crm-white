// ============================================================================
// Meta Ads (Graph API) — Fetch-based Client with Retry Logic
// ============================================================================
import type { MetaConfig } from './types';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------
export class MetaClientError extends Error {
  status: number;
  code?: number;
  type?: string;
  fbtraceId?: string;

  constructor(
    message: string,
    status: number,
    code?: number,
    type?: string,
    fbtraceId?: string,
  ) {
    super(message);
    this.name = 'MetaClientError';
    this.status = status;
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
  }

  toString(): string {
    return `MetaClientError [${this.status}${this.code ? `:${this.code}` : ''}]: ${this.message}`;
  }
}

// ---------------------------------------------------------------------------
// Retry configuration — Meta transient error codes
// https://developers.facebook.com/docs/graph-api/guides/error-handling
// ---------------------------------------------------------------------------
const RETRYABLE_ERROR_CODES = new Set([1, 2, 4, 17, 341]);
const MAX_RETRIES = 3;

interface MetaErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
    error_subcode?: number;
  };
}

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>,
): string {
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Executes a fetch request with retry on Meta transient error codes.
 * Returns the parsed JSON body or throws a MetaClientError.
 */
async function executeWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES,
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    const bodyText = await response.text();

    // Parse JSON (Meta always returns JSON, even for errors)
    let parsed: unknown = null;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // body was not JSON
    }

    // Check for Meta error payload
    const errorPayload = parsed as MetaErrorPayload | null;
    const err = errorPayload?.error;

    if (!response.ok || err) {
      const errorCode = err?.code;

      // Retry on transient Meta error codes
      if (errorCode !== undefined && RETRYABLE_ERROR_CODES.has(errorCode) && attempt < maxRetries) {
        const delay = (attempt + 1) * 1000; // 1s, 2s, 3s
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error or out of retries
      if (err) {
        throw new MetaClientError(
          err.message || 'Meta API request failed',
          response.status,
          err.code,
          err.type,
          err.fbtrace_id,
        );
      }

      throw new MetaClientError(
        `Meta API request failed with status ${response.status}`,
        response.status,
      );
    }

    return parsed;
  }

  // Should not reach here, but satisfy the type checker
  throw new MetaClientError('Meta API request failed after retries', 0);
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export class MetaClient {
  private accessToken: string;
  private adAccountId: string;
  private apiVersion: string;
  private readonly baseUrl: string;

  constructor(accessToken: string, adAccountId: string, apiVersion: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = apiVersion;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  get adAccountPath(): string {
    return `/${this.adAccountId}`;
  }

  /**
   * GET request. Access token is added as a query parameter.
   */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const allParams: Record<string, string> = {
      access_token: this.accessToken,
      ...params,
    };
    const url = buildUrl(this.baseUrl, path, allParams);
    return (await executeWithRetry(url, { method: 'GET' })) as T;
  }

  /**
   * POST request. Access token is added to the request body.
   */
  async post<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path);
    const body = new URLSearchParams({
      access_token: this.accessToken,
      ...Object.fromEntries(
        Object.entries(params || {}).map(([k, v]) => [k, String(v)]),
      ),
    });

    return (
      await executeWithRetry(url, {
        method: 'POST',
        body,
      })
    ) as T;
  }

  /**
   * DELETE request. Access token is added as a query parameter.
   */
  async delete<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const allParams: Record<string, string> = {
      access_token: this.accessToken,
      ...params,
    };
    const url = buildUrl(this.baseUrl, path, allParams);
    return (await executeWithRetry(url, { method: 'DELETE' })) as T;
  }
}

// ---------------------------------------------------------------------------
// Factory: create a MetaClient from environment variables with overrides
// ---------------------------------------------------------------------------
export function createMetaClient(overrides: Partial<MetaConfig> = {}): MetaClient {
  const accessToken = overrides.accessToken || process.env.META_ADS_ACCESS_TOKEN || '';
  const adAccountId = overrides.adAccountId || process.env.META_ADS_AD_ACCOUNT_ID || '';
  const apiVersion = overrides.apiVersion || process.env.META_ADS_API_VERSION || 'v25.0';
  return new MetaClient(accessToken, adAccountId, apiVersion);
}
