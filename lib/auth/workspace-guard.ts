// ============================================================================
// Workspace (company) authorization guard for API routes — server-only
//
// Every ad-platform API request must prove two things:
//   1. the caller holds a valid Firebase ID token (authentication), and
//   2. that user is a member of the workspace/company it is asking about
//      (authorization / tenant isolation).
//
// The `__session` cookie and the `x-company-id` header the middleware injects
// are NOT trusted here: the cookie is an unsigned base64 payload, and a client
// can supply its own `x-company-id` header. The workspace id is therefore taken
// from the request and validated against `workspace_members` on every call.
// ============================================================================
import { getAdminDatabase } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/auth/verify-token';

export interface WorkspaceAccess {
  uid: string;
  email: string;
  workspaceId: string;
  role: string;
}

export class WorkspaceAccessError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'WorkspaceAccessError';
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Membership cache — `workspace_members` is a root collection, so resolving a
// membership is the hottest read on this path. A short TTL keeps page loads
// cheap without letting a revoked membership linger.
// ---------------------------------------------------------------------------
const MEMBERSHIP_TTL_MS = 30_000;
const MEMBERSHIP_CACHE_MAX = 5_000;
const membershipCache = new Map<string, { role: string | null; expiresAt: number }>();

function cacheGet(key: string): { role: string | null } | null {
  const hit = membershipCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    membershipCache.delete(key);
    return null;
  }
  return { role: hit.role };
}

function cacheSet(key: string, role: string | null): void {
  if (membershipCache.size >= MEMBERSHIP_CACHE_MAX) {
    // Cheap eviction: drop the oldest insertion.
    const oldest = membershipCache.keys().next();
    if (!oldest.done) membershipCache.delete(oldest.value);
  }
  membershipCache.set(key, { role, expiresAt: Date.now() + MEMBERSHIP_TTL_MS });
}

/** Clears cached membership for a user, e.g. after a role change. */
export function invalidateMembershipCache(uid?: string): void {
  if (!uid) {
    membershipCache.clear();
    return;
  }
  for (const key of Array.from(membershipCache.keys())) {
    if (key.startsWith(`${uid}:`)) membershipCache.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Membership resolution
// ---------------------------------------------------------------------------
interface MemberRow {
  user_id?: string;
  workspace_id?: string;
  role?: string;
}

/**
 * Resolves the caller's role in a workspace, or null when they are not a
 * member. Prefers an indexed query on `user_id` (requires `.indexOn: "user_id"`
 * on `workspace_members`) and falls back to a scan if the index is absent.
 */
async function resolveRole(uid: string, workspaceId: string): Promise<string | null> {
  const db = getAdminDatabase();
  const membersRef = db.ref('workspace_members');

  let rows: Record<string, MemberRow> | null = null;
  try {
    const snapshot = await membersRef.orderByChild('user_id').equalTo(uid).once('value');
    rows = (snapshot.val() as Record<string, MemberRow> | null) || {};
  } catch {
    // No index configured — fall back to a full read of the collection.
    const snapshot = await membersRef.once('value');
    rows = (snapshot.val() as Record<string, MemberRow> | null) || {};
  }

  for (const row of Object.values(rows)) {
    if (row && row.user_id === uid && row.workspace_id === workspaceId) {
      return row.role || 'member';
    }
  }

  // A freshly created workspace records its owner before the member row lands.
  const wsSnapshot = await db.ref(`workspaces/${workspaceId}/owner_id`).once('value');
  if (wsSnapshot.exists() && wsSnapshot.val() === uid) return 'owner';

  return null;
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------
function readBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Authenticates the request and asserts the caller belongs to `workspaceId`.
 * Throws `WorkspaceAccessError` — callers should convert it with
 * `workspaceAccessResponse`.
 */
export async function requireWorkspaceAccess(
  req: Request,
  workspaceId: string | null | undefined,
): Promise<WorkspaceAccess> {
  const token = readBearerToken(req);
  if (!token) {
    throw new WorkspaceAccessError('Authentication required', 401, 'unauthenticated');
  }

  const payload = await verifyAuthToken(token);
  if (!payload?.uid) {
    throw new WorkspaceAccessError('Invalid or expired session', 401, 'unauthenticated');
  }

  if (!workspaceId || typeof workspaceId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(workspaceId)) {
    throw new WorkspaceAccessError('A valid workspaceId is required', 400, 'invalid_workspace');
  }

  const cacheKey = `${payload.uid}:${workspaceId}`;
  const cached = cacheGet(cacheKey);
  const role = cached ? cached.role : await resolveRole(payload.uid, workspaceId);
  if (!cached) cacheSet(cacheKey, role);

  if (!role) {
    // Same response for "workspace does not exist" and "not a member" so the
    // endpoint cannot be used to probe for other companies' workspace ids.
    throw new WorkspaceAccessError('You do not have access to this workspace', 403, 'forbidden');
  }

  return { uid: payload.uid, email: payload.email, workspaceId, role };
}

/** Roles permitted to connect, disconnect, or trigger a sync. */
const MANAGE_ROLES = new Set(['owner', 'admin', 'manager']);

/** Asserts the caller may change integration state (not just read it). */
export function requireManageRole(access: WorkspaceAccess): void {
  if (!MANAGE_ROLES.has((access.role || '').toLowerCase())) {
    throw new WorkspaceAccessError(
      'Your role cannot change ad platform connections',
      403,
      'insufficient_role',
    );
  }
}

/**
 * Converts a guard failure into a JSON response. Returns null for anything else
 * so callers can keep their own error handling for real faults.
 */
export function workspaceAccessResponse(error: unknown): Response | null {
  if (!(error instanceof WorkspaceAccessError)) return null;
  return new Response(JSON.stringify({ error: error.message, code: error.code }), {
    status: error.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
