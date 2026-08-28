// ============================================================================
// Ad platform error classification (server-only)
//
// Turns provider-specific failures into a small, user-safe vocabulary. Messages
// produced here are shown in the UI, so they must never contain tokens, secrets,
// or raw provider payloads.
// ============================================================================
import { MetaClientError } from '@/lib/connectors/meta/client';
import { GoogleAdsError } from '@/lib/connectors/google/client';

export type AdErrorKind =
  | 'auth' // token expired, revoked, or missing permission → needs reauth
  | 'rate_limit' // provider throttled us → back off and retry later
  | 'transient' // 5xx / network → safe to retry
  | 'not_found' // account or campaign no longer visible
  | 'config' // our own app credentials are missing/invalid
  | 'unknown';

export interface ClassifiedAdError {
  kind: AdErrorKind;
  /** Safe to render in the UI. */
  message: string;
  /** True when the connection should be flagged as needing re-authorization. */
  needsReauth: boolean;
  retryable: boolean;
}

/** Meta error codes that mean the token or permission is no longer usable. */
const META_AUTH_CODES = new Set([102, 190, 200, 458, 459, 460, 463, 464, 467]);
/** Meta throttling codes (app / account / user level rate limits). */
const META_RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80004]);

export class AdIntegrationError extends Error {
  kind: AdErrorKind;
  needsReauth: boolean;
  retryable: boolean;

  constructor(classified: ClassifiedAdError) {
    super(classified.message);
    this.name = 'AdIntegrationError';
    this.kind = classified.kind;
    this.needsReauth = classified.needsReauth;
    this.retryable = classified.retryable;
  }
}

function build(
  kind: AdErrorKind,
  message: string,
  opts: { needsReauth?: boolean; retryable?: boolean } = {},
): ClassifiedAdError {
  return {
    kind,
    message,
    needsReauth: opts.needsReauth ?? kind === 'auth',
    retryable: opts.retryable ?? (kind === 'rate_limit' || kind === 'transient'),
  };
}

function classifyMeta(error: MetaClientError): ClassifiedAdError {
  const code = error.code;

  if (code !== undefined && META_AUTH_CODES.has(code)) {
    return build(
      'auth',
      'Meta access has expired or was revoked. Reconnect Meta Ads to resume syncing.',
    );
  }
  if (code !== undefined && META_RATE_LIMIT_CODES.has(code)) {
    return build('rate_limit', 'Meta Ads is rate limiting requests. The next sync will retry.');
  }
  if (error.status === 401 || error.status === 403) {
    return build(
      'auth',
      'Meta denied access to this ad account. Check the account permissions and reconnect.',
    );
  }
  if (error.status === 404) {
    return build('not_found', 'This Meta ad account is no longer available.');
  }
  if (error.status === 429) {
    return build('rate_limit', 'Meta Ads is rate limiting requests. The next sync will retry.');
  }
  if (error.status >= 500) {
    return build('transient', 'Meta Ads is temporarily unavailable. The next sync will retry.');
  }
  return build('unknown', 'Meta Ads returned an unexpected error while reading campaigns.');
}

function classifyGoogle(error: GoogleAdsError): ClassifiedAdError {
  const message = error.message || '';

  if (
    error.status === 401 ||
    /invalid_grant|unauthorized_client|token has been expired or revoked/i.test(message)
  ) {
    return build(
      'auth',
      'Google Ads access has expired or was revoked. Reconnect Google Ads to resume syncing.',
    );
  }
  if (error.status === 403) {
    if (/developer.?token/i.test(message)) {
      return build('config', 'The Google Ads developer token is not approved for this request.', {
        needsReauth: false,
        retryable: false,
      });
    }
    return build(
      'auth',
      'Google denied access to this customer account. Check the account permissions and reconnect.',
    );
  }
  if (error.status === 404) {
    return build('not_found', 'This Google Ads customer account is no longer available.');
  }
  if (error.status === 429 || /RESOURCE_EXHAUSTED|QUOTA_ERROR/i.test(message)) {
    return build('rate_limit', 'Google Ads is rate limiting requests. The next sync will retry.');
  }
  if (error.status >= 500) {
    return build('transient', 'Google Ads is temporarily unavailable. The next sync will retry.');
  }
  return build('unknown', 'Google Ads returned an unexpected error while reading campaigns.');
}

/**
 * Classifies any thrown value into a user-safe error. Unknown shapes collapse to
 * a generic message rather than leaking `error.message` from an unvetted source.
 */
export function classifyAdError(error: unknown): ClassifiedAdError {
  if (error instanceof AdIntegrationError) {
    return {
      kind: error.kind,
      message: error.message,
      needsReauth: error.needsReauth,
      retryable: error.retryable,
    };
  }
  if (error instanceof MetaClientError) return classifyMeta(error);
  if (error instanceof GoogleAdsError) return classifyGoogle(error);

  if (error instanceof Error && /ADS_[A-Z_]+ is not configured|not configured/i.test(error.message)) {
    return build('config', 'This integration is not configured on the server yet.', {
      needsReauth: false,
      retryable: false,
    });
  }
  if (error instanceof Error && /fetch failed|ETIMEDOUT|ECONNRESET|network/i.test(error.message)) {
    return build('transient', 'Could not reach the ad platform. The next sync will retry.');
  }

  return build('unknown', 'Sync failed because of an unexpected error.');
}

/**
 * Logs a failure without ever writing credentials to the log. Only the
 * classification, HTTP status and provider code are recorded.
 */
export function logAdError(scope: string, error: unknown): ClassifiedAdError {
  const classified = classifyAdError(error);
  const status =
    error instanceof MetaClientError || error instanceof GoogleAdsError ? error.status : undefined;
  const code =
    error instanceof MetaClientError || error instanceof GoogleAdsError ? error.code : undefined;

  console.error(
    `[ads:${scope}] kind=${classified.kind}` +
      (status !== undefined ? ` status=${status}` : '') +
      (code !== undefined ? ` code=${code}` : ''),
  );

  return classified;
}
