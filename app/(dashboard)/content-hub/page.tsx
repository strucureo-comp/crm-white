'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, FileText, Loader2, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { ContentItemDialog } from '@/components/dialogs/content-item-dialog';
import { getContentItems, deleteContentItem } from '@/lib/firebase/database';
import type { ContentItem, ContentStatus } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ContentHubPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getContentItems();
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
      await deleteContentItem(id);
      load();
    } catch {
      toast.error('Failed to delete content');
    } finally {
      setConfirmState({ open: false });
    }
  }

  const statuses: ContentStatus[] = ['Draft', 'In Review', 'Scheduled', 'Published'];
  const grouped = statuses.reduce((acc, s) => {
    acc[s] = items.filter((i) => i.status === s);
    return acc;
  }, {} as Record<string, ContentItem[]>);
  const hasContent = items.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Content Hub</h2>
          <p className="text-sm text-muted-foreground">Manage your content workflow</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          New Content
        </Button>
      </div>

      {!hasContent ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No content yet. Create your first piece.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status) => (
            <div key={status} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{status}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {grouped[status]?.length || 0}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                  <Plus size={12} />
                </Button>
              </div>
              <div className="space-y-3">
                {grouped[status]?.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-sm transition-shadow relative" onClick={() => { setEditing(item); setDialogOpen(true); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-primary shrink-0" />
                          <p className="text-sm font-medium">{item.title}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id); }}>
                          <MoreHorizontal size={12} />
                        </Button>
                      </div>
                      {menuOpen === item.id && (
                        <div className="absolute right-8 top-8 z-10 w-28 rounded-md border bg-background shadow-lg">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { setEditing(item); setMenuOpen(null); setDialogOpen(true); }}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete(item.id); setMenuOpen(null); }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.type}</Badge>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-muted">{item.author[0]}</AvatarFallback>
                          </Avatar>
                          <span>{timeAgo(item.updated_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!grouped[status] || grouped[status].length === 0) && (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">No content</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContentItemDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} item={editing} />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete content"
        description="Are you sure you want to delete this content? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
