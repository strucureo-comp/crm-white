// ============================================================================
// Ad Connector — Token encryption at rest (server-only)
//
// OAuth access/refresh tokens are encrypted with AES-256-GCM before they are
// written to the database, so a database read alone never yields a usable
// credential. Plaintext tokens never leave this module's callers and are never
// logged or returned to the frontend.
// ============================================================================
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce length
const ENVELOPE_VERSION = 'v1';

export class AdCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdCryptoError';
  }
}

/**
 * Derives the 32-byte AES key from ADS_TOKEN_ENCRYPTION_KEY.
 *
 * Accepts a 64-char hex string or a base64 value that decodes to 32 bytes. Any
 * other value is hashed with SHA-256 so a long random passphrase also works.
 */
function getKey(): Buffer {
  const secret = process.env.ADS_TOKEN_ENCRYPTION_KEY || '';
  if (!secret) {
    throw new AdCryptoError('ADS_TOKEN_ENCRYPTION_KEY is not configured');
  }

  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }

  const asBase64 = Buffer.from(secret, 'base64');
  if (asBase64.length === 32) {
    return asBase64;
  }

  if (secret.length < 32) {
    throw new AdCryptoError(
      'ADS_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars) or a passphrase of at least 32 characters',
    );
  }

  return createHash('sha256').update(secret).digest();
}

/** True when the server is configured to store ad-platform credentials. */
export function isTokenEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypts a token. Output format: `v1:<iv-b64>:<authTag-b64>:<ciphertext-b64>`.
 */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new AdCryptoError('Cannot encrypt an empty value');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a value produced by `encryptSecret`. Throws if the envelope is
 * malformed or the auth tag does not verify (tampering / wrong key).
 */
export function decryptSecret(envelope: string): string {
  if (!envelope || typeof envelope !== 'string') {
    throw new AdCryptoError('Missing encrypted value');
  }

  const parts = envelope.split(':');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new AdCryptoError('Unrecognised encrypted value format');
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Deliberately opaque: never echo key material or ciphertext.
    throw new AdCryptoError('Failed to decrypt stored credential');
  }
}
