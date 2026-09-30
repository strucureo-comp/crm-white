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
      console.warn(`[assets:upload] No connection found for workspace ${access.workspaceId}`);
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

    console.log(`[assets:upload] User: ${access.uid}, Workspace: ${access.workspaceId}, File: ${file.name}, Size: ${file.size}, Mime: ${file.type}, Folder: ${folder}`);
    console.log(`[assets:upload] Drive Connected: true, Access Token exists: ${!!connection.accessToken}, Refresh Token exists: ${!!connection.refreshToken}`);

    // Get a valid access token (refresh if needed)
    let accessToken = connection.accessToken;
    if (connection.accessTokenExpiresAt && Date.now() > connection.accessTokenExpiresAt) {
      console.log(`[assets:upload] Access token expired. Refreshing...`);
      try {
        accessToken = await refreshGoogleDriveAccessToken(connection.refreshToken);
        
        // Update connection with new access token
        const { upsertConnection } = await import('@/lib/assets/google-drive');
        await upsertConnection(access.workspaceId, {
          accessToken: accessToken,
          refreshToken: connection.refreshToken,
          scopes: connection.scopes,
          uid: connection.uid,
          email: connection.email,
          driveFolderId: connection.driveFolderId,
        });
      } catch (err) {
        console.error(`[assets:upload] Token refresh failed:`, err);
        return NextResponse.json(
          { error: 'Drive connection expired. Please reconnect.', code: 'reauth_required' },
          { status: 401 },
        );
      }
    }

    // Determine parent folder: use workspace's dedicated folder or root
    let parentFolderId = connection.driveFolderId || undefined;

    // Resolve specific subfolder if provided (e.g. "Product screenshots")
    if (folder && folder !== 'Uncategorized') {
      try {
        // Search for the folder by name
        let q = `mimeType='application/vnd.google-apps.folder' and name='${folder.replace(/'/g, "\\'")}' and trashed=false`;
        if (parentFolderId) {
          q += ` and '${parentFolderId}' in parents`;
        }

        const params = new URLSearchParams({
          q,
          fields: 'files(id, name)',
          pageSize: '1'
        });

        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            parentFolderId = searchData.files[0].id;
          } else {
            // Folder doesn't exist, create it
            const newFolder = await createDriveFolder(accessToken, folder, parentFolderId);
            parentFolderId = newFolder.id;
          }
        }
      } catch (err) {
        console.error(`[assets:upload] Failed to resolve subfolder '${folder}':`, err);
        // Continue with the parent folder if subfolder resolution fails
      }
    }

    console.log(`[assets:upload] Target Google Drive Folder ID: ${parentFolderId || 'root'}`);

    // Upload file to Google Drive via multipart upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const metadata: Record<string, any> = {
      name: file.name,
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

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
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,thumbnailLink',
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
      
      let errorMsg = 'Failed to upload to Google Drive';
      let statusCode = 500;
      
      if (uploadResponse.status === 401) {
        errorMsg = 'Google Drive token invalid or expired.';
        statusCode = 401;
      } else if (uploadResponse.status === 403) {
        errorMsg = 'Insufficient permission to upload to Google Drive.';
        statusCode = 403;
      } else if (uploadResponse.status === 404) {
        errorMsg = 'Target Google Drive folder not found.';
        statusCode = 404;
      } else if (uploadResponse.status === 400) {
        errorMsg = 'Invalid upload request sent to Google Drive.';
        statusCode = 400;
      }
      
      return NextResponse.json({ error: errorMsg, details: errorBody }, { status: statusCode });
    }

    const driveFile = (await uploadResponse.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      webViewLink?: string;
      thumbnailLink?: string;
    };

    console.log(`[assets:upload] Successfully uploaded to Drive. File ID: ${driveFile.id}`);

    // Store metadata in database
    const assetData: any = {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      folder,
      driveFileId: driveFile.id,
      uid: access.uid,
    };
    
    if (driveFile.webViewLink) assetData.driveViewLink = driveFile.webViewLink;
    if (driveFile.thumbnailLink) assetData.thumbnailLink = driveFile.thumbnailLink;

    const asset = await createAsset(access.workspaceId, assetData);

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    console.error('[assets:upload] Internal Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Failed to upload asset (Internal Error)' }, { status: 500 });
  }
}
