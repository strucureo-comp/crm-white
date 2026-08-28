// ============================================================================
// OAuth `state` — signed, single-use, workspace-bound (server-only)
//
// The state parameter carries the workspace and user the authorization belongs
// to. It is HMAC-signed so a callback cannot be replayed against a different
// company, and each nonce is recorded in the database and consumed on first use
// so an intercepted callback URL cannot be replayed at all.
// ============================================================================
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getAdminDatabase } from '@/lib/firebase/admin';
import type { AdPlatform } from './types';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const NONCE_PATH = 'ad_oauth_nonces';

export class OAuthStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthStateError';
  }
}

interface StatePayload {
  w: string; // workspace id
  u: string; // uid
  p: AdPlatform;
  n: string; // nonce
  e: number; // expires at (epoch ms)
}

export interface VerifiedState {
  workspaceId: string;
  uid: string;
  platform: AdPlatform;
}

function getSigningKey(): Buffer {
  const secret =
    process.env.ADS_OAUTH_STATE_SECRET || process.env.ADS_TOKEN_ENCRYPTION_KEY || '';
  if (secret.length < 16) {
    throw new OAuthStateError('ADS_OAUTH_STATE_SECRET is not configured');
  }
  return Buffer.from(secret, 'utf8');
}

function sign(body: string): string {
  return createHmac('sha256', getSigningKey()).update(body).digest('base64url');
}

/**
 * Creates a signed state token and records its nonce so it can only be redeemed
 * once. Returns the value to pass as the provider's `state` parameter.
 */
export async function createOAuthState(
  platform: AdPlatform,
  workspaceId: string,
  uid: string,
): Promise<string> {
  const nonce = randomBytes(16).toString('base64url');
  const payload: StatePayload = {
    w: workspaceId,
    u: uid,
    p: platform,
    n: nonce,
    e: Date.now() + STATE_TTL_MS,
  };

  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const token = `${body}.${sign(body)}`;

  await getAdminDatabase()
    .ref(`${NONCE_PATH}/${nonce}`)
    .set({ workspace_id: workspaceId, uid, platform, expires_at: payload.e });

  return token;
}

/**
 * Verifies signature, expiry and single-use nonce, then consumes the nonce.
 * Throws `OAuthStateError` on any mismatch — callers must not proceed.
 */
export async function consumeOAuthState(token: string | null): Promise<VerifiedState> {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new OAuthStateError('Missing or malformed authorization state');
  }

  const separator = token.lastIndexOf('.');
  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(body);
  const providedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new OAuthStateError('Authorization state failed verification');
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new OAuthStateError('Authorization state failed verification');
  }

  if (!payload.w || !payload.u || !payload.n || !payload.p) {
    throw new OAuthStateError('Authorization state is incomplete');
  }
  if (!payload.e || Date.now() > payload.e) {
    throw new OAuthStateError('Authorization request expired — please try connecting again');
  }

  // Consume the nonce. A missing record means the callback was already used.
  const db = getAdminDatabase();
  const nonceRef = db.ref(`${NONCE_PATH}/${payload.n}`);
  const snapshot = await nonceRef.once('value');
  if (!snapshot.exists()) {
    throw new OAuthStateError('This authorization link has already been used');
  }
  const stored = snapshot.val() as { workspace_id?: string; uid?: string } | null;
  await nonceRef.remove();

  if (stored?.workspace_id !== payload.w || stored?.uid !== payload.u) {
    throw new OAuthStateError('Authorization state failed verification');
  }

  return { workspaceId: payload.w, uid: payload.u, platform: payload.p };
}

/**
 * Removes expired nonce records. Called opportunistically from the background
 * sync so the collection does not grow without bound.
 */
export async function pruneExpiredOAuthStates(): Promise<void> {
  try {
    const db = getAdminDatabase();
    const snapshot = await db.ref(NONCE_PATH).once('value');
    const rows = (snapshot.val() as Record<string, { expires_at?: number }> | null) || {};
    const now = Date.now();
    const updates: Record<string, null> = {};
    for (const [nonce, row] of Object.entries(rows)) {
      if (!row?.expires_at || row.expires_at < now) updates[nonce] = null;
    }
    if (Object.keys(updates).length > 0) {
      await db.ref(NONCE_PATH).update(updates);
    }
  } catch {
    // Housekeeping only — never fail a sync because pruning failed.
  }
}
