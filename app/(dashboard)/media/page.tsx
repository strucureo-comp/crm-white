'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Upload, Image, Video, FileText, Music, File, Folder, Grid, List, Trash2, HardDrive, Cloud } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getMedia, getMediaFolders, createMediaFolder, deleteMedia } from '@/lib/db/automation/api';
import { MediaFile, MediaFolder } from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const typeIcons: Record<string, React.ReactNode> = { image: <Image size={24} />, video: <Video size={24} />, audio: <Music size={24} />, document: <FileText size={24} />, other: <File size={24} /> };
const typeColors: Record<string, string> = { image: 'bg-pink-100 text-pink-600', video: 'bg-purple-100 text-purple-600', audio: 'bg-blue-100 text-blue-600', document: 'bg-orange-100 text-orange-600', other: 'bg-gray-100 text-gray-600' };

export default function MediaLibraryPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([getMedia(workspaceId), getMediaFolders(workspaceId)])
      .then(([f, fo]) => { setFiles(f); setFolders(fo); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folder = await createMediaFolder(workspaceId, {
      workspace_id: workspaceId,
      name: newFolderName,
      parent_id: currentFolder || undefined,
      path: currentFolder ? `${folders.find(f => f.folder_id === currentFolder)?.path || ''}/${newFolderName}` : `/${newFolderName}`,
    });
    setFolders([folder, ...folders]);
    setShowCreateFolderDialog(false);
    setNewFolderName('');
  };

  const handleDeleteFile = async (id: string) => {
    await deleteMedia(workspaceId, id);
    setFiles(files.filter(f => f.file_id !== id));
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) && (currentFolder ? f.folder_id === currentFolder : !f.folder_id));
  const subFolders = folders.filter(f => f.parent_id === currentFolder);
  const stats = { total: files.length, size: files.reduce((s, f) => s + (f.size || 0), 0), images: files.filter(f => f.type === 'image').length, folders: folders.length };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Media Library</h1><p className="text-muted-foreground">Upload, organize, and manage your media files</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateFolderDialog(true)}><Folder size={16} className="mr-2" />New Folder</Button>
          <Button onClick={() => fileInputRef.current?.click()}><Upload size={16} className="mr-2" />Upload</Button>
          <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Files</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Size</p><p className="text-2xl font-bold">{formatFileSize(stats.size)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Images</p><p className="text-2xl font-bold">{stats.images}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Folders</p><p className="text-2xl font-bold">{stats.folders}</p></CardContent></Card>
      </div>

      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      {currentFolder && <Button variant="ghost" size="sm" onClick={() => setCurrentFolder(null)}>Back to root</Button>}

      {subFolders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subFolders.map(f => (
            <Card key={f.folder_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setCurrentFolder(f.folder_id)}>
              <CardContent className="p-4 flex items-center gap-3"><Folder className="h-8 w-8 text-orange-500" /><span className="font-medium">{f.name}</span></CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No files yet</h3><Button onClick={() => fileInputRef.current?.click()}><Upload size={16} className="mr-2" />Upload Files</Button></CardContent></Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredFiles.map(f => (
            <Card key={f.file_id} className="group relative">
              <CardContent className="p-4">
                <div className={`w-full h-32 rounded-lg flex items-center justify-center mb-3 ${typeColors[f.type]}`}>{typeIcons[f.type]}</div>
                <p className="font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-600" onClick={() => handleDeleteFile(f.file_id)}><Trash2 size={14} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map(f => (
            <Card key={f.file_id}><CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">{typeIcons[f.type]}<div><p className="font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(f.size)} - {f.type}</p></div></div>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteFile(f.file_id)}><Trash2 size={14} /></Button>
            </CardContent></Card>
          ))}
        </div>
      )}

      {showCreateFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">New Folder</h2>
            <Input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>Cancel</Button><Button onClick={handleCreateFolder}>Create</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
