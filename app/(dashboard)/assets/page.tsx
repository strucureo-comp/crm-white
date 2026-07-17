'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Search, Folder, ImageIcon, FileText, Video, Music, Loader2, HardDrive, Clock, X, Eye, Trash2, ClipboardCopy, Download, MoreHorizontal, File
} from 'lucide-react';
import { MediaItemDialog } from '@/components/dialogs/media-item-dialog';
import { getMediaItems, deleteMediaItem } from '@/lib/firebase/database';
import type { MediaItem } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const folders = [
  { id: 'all', label: 'All Assets', icon: Folder },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'other', label: 'Other', icon: File },
];

export default function AssetsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMediaItems();
      setItems(data);
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteMediaItem(id);
      toast.success('Asset deleted');
      load();
    } catch {
      toast.error('Failed to delete asset');
    } finally {
      setConfirmState({ open: false });
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    const totalSize = items.reduce((acc, item) => {
      const sizeMatch = item.size.match(/^([\d.]+)/);
      const num = sizeMatch ? parseFloat(sizeMatch[1]) : 0;
      if (item.size.includes('GB')) return acc + num * 1024;
      if (item.size.includes('MB')) return acc + num;
      if (item.size.includes('KB')) return acc + num / 1024;
      return acc;
    }, 0);
    const recent = items.filter((i) => {
      const diff = Date.now() - new Date(i.created_at).getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, totalSizeFormatted: totalSize.toFixed(1) + ' MB', recent };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFolder = activeFolder === 'all' || activeFolder === 'other'
        ? !['image', 'video', 'document', 'audio'].includes(item.type)
        : item.type === activeFolder;
      return matchesSearch && matchesFolder;
    });
  }, [items, search, activeFolder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <aside className="hidden md:flex flex-col w-56 shrink-0">
        <nav className="space-y-1">
          {folders.map((f) => {
            const Icon = f.icon;
            const count = f.id === 'all'
              ? items.length
              : f.id === 'other'
                ? items.filter((i) => !['image', 'video', 'document', 'audio'].includes(i.type)).length
                : items.filter((i) => i.type === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeFolder === f.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{f.label}</span>
                <span className="text-xs">{count}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Assets</h2>
            <p className="text-sm text-muted-foreground">Manage your file assets</p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="w-full sm:w-auto">
            <Upload size={16} className="mr-2" />
            Upload
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <HardDrive size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Files</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <HardDrive size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Size</p>
                <p className="text-lg font-bold">{stats.totalSizeFormatted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recent Uploads (7d)</p>
                <p className="text-lg font-bold">{stats.recent}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search assets..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <ImageIcon size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No assets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((item) => (
              <Card key={item.id} className="group cursor-pointer hover:shadow-sm transition-all" onClick={() => setPreview(item)}>
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {item.url && item.type === 'image' ? (
                      <Image src={item.url} alt={item.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" />
                    ) : (
                      <>
                        {item.type === 'image' && <ImageIcon size={32} className="text-muted-foreground/50" />}
                        {item.type === 'video' && <Video size={32} className="text-muted-foreground/50" />}
                        {item.type === 'document' && <FileText size={32} className="text-muted-foreground/50" />}
                        {item.type === 'audio' && <Music size={32} className="text-muted-foreground/50" />}
                        {!['image', 'video', 'document', 'audio'].includes(item.type) && <File size={32} className="text-muted-foreground/50" />}
                      </>
                    )}
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 bg-background/80" aria-label="File actions" onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}>
                        <MoreHorizontal size={12} />
                      </Button>
                      {menuOpen === item.id && (
                        <div className="absolute right-0 top-8 z-10 w-28 rounded-md border bg-background shadow-lg">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { item.url && window.open(item.url, '_blank'); setMenuOpen(null); }}>
                            <Eye size={12} /> Preview
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { item.url && navigator.clipboard.writeText(item.url); toast.success('URL copied'); setMenuOpen(null); }}>
                            <ClipboardCopy size={12} /> Copy URL
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { item.url && window.open(item.url, '_blank'); setMenuOpen(null); }}>
                            <Download size={12} /> Download
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete(item.id); setMenuOpen(null); }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <Badge className="absolute bottom-2 left-2 text-[9px] px-1 py-0" variant="secondary">{item.type}</Badge>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.size}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <MediaItemDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={load} />

        <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{preview?.name}</DialogTitle>
            </DialogHeader>
            {preview && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg flex items-center justify-center overflow-hidden max-h-[400px]">
                  {preview.type === 'image' && preview.url ? (
                    <Image src={preview.url} alt={preview.name} width={600} height={400} className="object-contain max-h-[400px] w-auto" />
                  ) : preview.type === 'video' && preview.url ? (
                    <video src={preview.url} controls className="max-h-[400px] w-full" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12">
                      {preview.type === 'audio' ? <Music size={48} className="text-muted-foreground/50" /> : <FileText size={48} className="text-muted-foreground/50" />}
                      <p className="text-sm text-muted-foreground">Preview not available</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> {preview.type}</div>
                  <div><span className="text-muted-foreground">Size:</span> {preview.size}</div>
                  <div><span className="text-muted-foreground">Dimensions:</span> {preview.dimensions}</div>
                  <div><span className="text-muted-foreground">Created:</span> {new Date(preview.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  {preview.url && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(preview.url!); toast.success('URL copied'); }}>
                        <ClipboardCopy size={14} className="mr-1" /> Copy URL
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(preview.url, '_blank')}>
                        <Download size={14} className="mr-1" /> Download
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => { setPreview(null); handleDelete(preview.id); }}>
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirmState.open}
          onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
          title="Delete asset"
          description="Are you sure you want to delete this asset? This action cannot be undone."
          onConfirm={onDeleteConfirm}
          loading={confirmState.loading}
        />
      </div>
    </div>
  );
}
