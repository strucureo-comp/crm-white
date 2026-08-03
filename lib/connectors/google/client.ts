// ============================================================================
// Google Ads API — Fetch-based Client with OAuth Refresh & Retry Logic
// ============================================================================
import type {
  GoogleAdsConfig,
  MutateResponse,
  SearchResponse,
} from './types';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------
export class GoogleAdsError extends Error {
  status: number;
  code?: number;
  details?: unknown;

  constructor(message: string, status: number, code?: number, details?: unknown) {
    super(message);
    this.name = 'GoogleAdsError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toString(): string {
    return `GoogleAdsError [${this.status}${this.code ? `:${this.code}` : ''}]: ${this.message}`;
  }
}

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export class GoogleAdsClient {
  private config: GoogleAdsConfig;
  private cachedToken: CachedToken | null = null;
  private readonly baseUrl = 'https://googleads.googleapis.com/v25/';

  constructor(config: GoogleAdsConfig) {
    this.config = config;
  }

  // -------------------------------------------------------------------------
  // OAuth token refresh — exchanges a refresh_token for a fresh access_token.
  // The token is cached until 60 seconds before expiry to avoid edge cases.
  // -------------------------------------------------------------------------
  private async refreshAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GoogleAdsError(
        `Failed to refresh access token: ${response.status} ${errorText}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    const expiresIn = data.expires_in || 3600;
    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000, // 60 s buffer
    };
    return data.access_token;
  }

  // -------------------------------------------------------------------------
  // Required headers for every Google Ads API request
  // -------------------------------------------------------------------------
  private buildHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': this.config.developerToken,
      'login-customer-id': this.config.loginCustomerId,
      'Content-Type': 'application/json',
    };
  }

  // -------------------------------------------------------------------------
  // The customer-scoped path prefix, e.g. customers/1234567890
  // -------------------------------------------------------------------------
  get customersPath(): string {
    return `customers/${this.config.customerId}`;
  }

  // -------------------------------------------------------------------------
  // Core request method with retry on 429, 500, 503
  // -------------------------------------------------------------------------
  async request<T>(
    method: string,
    path: string,
    data?: unknown,
    attempt = 1,
  ): Promise<T> {
    const accessToken = await this.refreshAccessToken();
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders(accessToken);

    const options: RequestInit = { method, headers };
    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    // Retry on transient errors
    if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_ATTEMPTS) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.request<T>(method, path, data, attempt + 1);
    }

    const bodyText = await response.text();

    if (!response.ok) {
      let errorData: {
        error?: {
          code?: number;
          message?: string;
          status?: string;
          details?: unknown;
        };
      } = {};
      try {
        errorData = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        // body was not JSON
      }
      const err = errorData.error;
      throw new GoogleAdsError(
        err?.message || `Google Ads API request failed with status ${response.status}`,
        response.status,
        err?.code,
        err?.details,
      );
    }

    try {
      return bodyText ? JSON.parse(bodyText) : null;
    } catch {
      return bodyText as unknown as T;
    }
  }

  // -------------------------------------------------------------------------
  // Convenience: mutate (create/update/remove) operations
  // -------------------------------------------------------------------------
  async mutate<T = MutateResponse>(
    resource: string,
    operations: Record<string, unknown>[],
  ): Promise<T> {
    return this.request<T>('POST', `${this.customersPath}/${resource}:mutate`, {
      operations,
    });
  }

  // -------------------------------------------------------------------------
  // Convenience: GAQL search
  // -------------------------------------------------------------------------
  async search<T = unknown>(query: string): Promise<SearchResponse<T>> {
    return this.request<SearchResponse<T>>(
      'POST',
      `${this.customersPath}/googleAds:search`,
      { query },
    );
  }
}

// ---------------------------------------------------------------------------
// Factory: create a GoogleAdsClient from environment variables with overrides
// ---------------------------------------------------------------------------
export function createGoogleAdsClient(
  overrides: Partial<GoogleAdsConfig> = {},
): GoogleAdsClient {
  const config: GoogleAdsConfig = {
    clientId: overrides.clientId || process.env.GOOGLE_ADS_CLIENT_ID || '',
    clientSecret: overrides.clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    refreshToken: overrides.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    developerToken: overrides.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    loginCustomerId:
      overrides.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
    customerId: overrides.customerId || process.env.GOOGLE_ADS_CUSTOMER_ID || '',
  };
  return new GoogleAdsClient(config);
}
