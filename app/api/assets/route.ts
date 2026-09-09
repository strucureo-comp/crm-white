// ============================================================================
// GET  /api/assets?workspaceId=&folder=&type=
// POST /api/assets (multipart/form-data)
//
// Lists or uploads assets for the caller's workspace.
// Upload goes to Google Drive; metadata is stored in the database.
// ============================================================================
import { NextResponse } from 'next/server';
import {
  requireWorkspaceAccess,
  workspaceAccessResponse,
} from '@/lib/auth/workspace-guard';
import {
  getConnection,
  refreshGoogleDriveAccessToken,
  listDriveFiles,
  createDriveFolder,
} from '@/lib/assets/google-drive';
import {
  listAssets,
  createAsset,
  getAssetCountByType,
} from '@/lib/assets/store';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'application/pdf', 'text/'];
const ALLOWED_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function isAllowedMimeType(mime: string): boolean {
  if (ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;
  return ALLOWED_MIME_TYPES.includes(mime);
}

// ---------------------------------------------------------------------------
// GET — list assets
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const folder = url.searchParams.get('folder') || undefined;
    const type = url.searchParams.get('type') || undefined;

    const mimeTypes = type
      ? type === 'image'
        ? ['image/']
        : type === 'video'
          ? ['video/']
          : type === 'pdf'
            ? ['application/pdf']
            : undefined
      : undefined;

    const assets = await listAssets(access.workspaceId, { folder, mimeTypes });
    const counts = await getAssetCountByType(access.workspaceId);

    return NextResponse.json({ assets, counts });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:list]', error);
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — upload asset to Google Drive + store metadata
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const workspaceId = req.headers.get('x-workspace-id');
    const access = await requireWorkspaceAccess(req, workspaceId);

    const connection = await getConnection(access.workspaceId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Google Drive is not connected. Please connect first.', code: 'not_connected' },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'Uncategorized';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 },
      );
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Get a valid access token (refresh if needed)
    let accessToken = connection.accessToken;
    try {
      if (connection.accessTokenExpiresAt && Date.now() > connection.accessTokenExpiresAt) {
        accessToken = await refreshGoogleDriveAccessToken(connection.refreshToken);
      }
    } catch {
      return NextResponse.json(
        { error: 'Drive connection expired. Please reconnect.', code: 'reauth_required' },
        { status: 401 },
      );
    }

    // Determine parent folder: use workspace's dedicated folder or root
    const parentFolderId = connection.driveFolderId || undefined;

    // Upload file to Google Drive via multipart upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const metadata = {
      name: file.name,
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    // Metadata part
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      ),
    );

    // File part
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Type: ${file.type}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBuffer.toString('base64')}\r\n`,
      ),
    );

    // End boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text().catch(() => '');
      console.error('[assets:upload] Drive upload failed:', uploadResponse.status, errorBody);
      return NextResponse.json({ error: 'Failed to upload to Google Drive' }, { status: 500 });
    }

    const driveFile = (await uploadResponse.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      webViewLink?: string;
      thumbnailLink?: string;
    };

    // Store metadata in database
    const asset = await createAsset(access.workspaceId, {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      folder,
      driveFileId: driveFile.id,
      driveViewLink: driveFile.webViewLink,
      thumbnailLink: driveFile.thumbnailLink,
      uid: access.uid,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:upload]', error);
    return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 });
  }
}
