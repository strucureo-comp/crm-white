import { createVerify } from 'crypto';

interface TokenPayload {
  uid: string;
  email: string;
  exp: number;
  iat: number;
  aud: string;
  iss: string;
  sub: string;
}

let cachedKeys: { [kid: string]: string } | null = null;
let keysFetchedAt = 0;

async function getPublicKeys(): Promise<{ [kid: string]: string }> {
  const fiveMinutes = 5 * 60 * 1000;
  if (cachedKeys && Date.now() - keysFetchedAt < fiveMinutes) {
    return cachedKeys;
  }

  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Firebase public keys');
  }

  cachedKeys = await response.json() as { [kid: string]: string };
  keysFetchedAt = Date.now();
  return cachedKeys;
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

function pemToBuffer(pem: string): Buffer {
  const b64 = pem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  return Buffer.from(b64, 'base64');
}

export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload: TokenPayload = JSON.parse(base64UrlDecode(parts[1]));
    const signature = parts[2];

    if (!header.kid) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.iat > now) return null;

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;

    const keys = await getPublicKeys();
    const publicKeyPem = keys[header.kid];
    if (!publicKeyPem) return null;

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);

    const isValid = verifier.verify(
      { key: pemToBuffer(publicKeyPem), format: 'der', type: 'spki' },
      Buffer.from(signature, 'base64url')
    );

    if (!isValid) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function verifyRequest(req: Request): Promise<TokenPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyAuthToken(authHeader.slice(7));
}
