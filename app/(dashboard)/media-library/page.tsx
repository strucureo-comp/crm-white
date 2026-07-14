'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, ImageIcon, FileText, Video, Music, Grid3X3, List, MoreHorizontal, Loader2, ClipboardCopy, Download, Trash2, Pencil } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MediaItemDialog } from '@/components/dialogs/media-item-dialog';
import { getMediaItems, deleteMediaItem } from '@/lib/firebase/database';
import type { MediaItem } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function MediaLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMediaItems();
    setItems(data);
    setLoading(false);
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
      toast.success('File deleted');
      load();
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setConfirmState({ open: false });
    }
  }

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Media Library</h2>
          <p className="text-sm text-muted-foreground">Upload and manage your media assets</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Upload size={16} className="mr-2" />
          Upload Files
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search media..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg">
            <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none rounded-l-lg" onClick={() => setView('grid')}>
              <Grid3X3 size={16} />
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none rounded-r-lg" onClick={() => setView('list')}>
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ImageIcon size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No media files yet</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="group cursor-pointer hover:shadow-sm transition-all" onClick={() => item.url && window.open(item.url, '_blank')}>
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
                    </>
                  )}
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 bg-background/80" onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}>
                      <MoreHorizontal size={12} />
                    </Button>
                    {menuOpen === item.id && (
                      <div className="absolute right-0 top-8 z-10 w-28 rounded-md border bg-background shadow-lg">
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Size</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Dimensions</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => item.url && window.open(item.url, '_blank')}>
                    <td className="px-4 py-3 text-sm">{item.name}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{item.type}</Badge></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.size}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.dimensions}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}>
                          <MoreHorizontal size={14} />
                        </Button>
                        {menuOpen === item.id && (
                          <div className="absolute right-0 top-8 z-10 w-28 rounded-md border bg-background shadow-lg">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      <MediaItemDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete file"
        description="Are you sure you want to delete this file? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
