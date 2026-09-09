// ============================================================================
// OAuth `state` — signed, single-use, workspace-bound (server-only)
//
// Adapted from lib/ads/oauth-state.ts for Google Drive asset connections.
// Uses a separate nonce collection to avoid conflicts.
// ============================================================================
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getAdminDatabase } from '@/lib/firebase/admin';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const NONCE_PATH = 'asset_oauth_nonces';

export class OAuthStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthStateError';
  }
}

interface StatePayload {
  w: string; // workspace id
  u: string; // uid
  n: string; // nonce
  e: number; // expires at (epoch ms)
}

export interface VerifiedState {
  workspaceId: string;
  uid: string;
}

function getSigningKey(): Buffer {
  const secret =
    process.env.ASSET_OAUTH_STATE_SECRET || process.env.ADS_OAUTH_STATE_SECRET || process.env.ADS_TOKEN_ENCRYPTION_KEY || '';
  if (secret.length < 16) {
    throw new OAuthStateError('ASSET_OAUTH_STATE_SECRET is not configured');
  }
  return Buffer.from(secret, 'utf8');
}

function sign(body: string): string {
  return createHmac('sha256', getSigningKey()).update(body).digest('base64url');
}

export async function createOAuthState(
  workspaceId: string,
  uid: string,
): Promise<string> {
  const nonce = randomBytes(16).toString('base64url');
  const payload: StatePayload = {
    w: workspaceId,
    u: uid,
    n: nonce,
    e: Date.now() + STATE_TTL_MS,
  };

  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const token = `${body}.${sign(body)}`;

  await getAdminDatabase()
    .ref(`${NONCE_PATH}/${nonce}`)
    .set({ workspace_id: workspaceId, uid, expires_at: payload.e });

  return token;
}

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

  if (!payload.w || !payload.u || !payload.n) {
    throw new OAuthStateError('Authorization state is incomplete');
  }
  if (!payload.e || Date.now() > payload.e) {
    throw new OAuthStateError('Authorization request expired — please try connecting again');
  }

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

  return { workspaceId: payload.w, uid: payload.u };
}
