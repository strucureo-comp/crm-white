'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, FileText, Eye, Trash2, Newspaper, BookOpen, Globe } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getContent, createContent, deleteContent } from '@/lib/db/automation/api';
import { ContentItem } from '@/lib/db/automation/types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

const typeColors: Record<string, string> = {
  blog: 'bg-blue-100 text-blue-800',
  landing_page: 'bg-orange-100 text-orange-800',
  case_study: 'bg-purple-100 text-purple-800',
  newsletter: 'bg-green-100 text-green-800',
  knowledge_base: 'bg-cyan-100 text-cyan-800',
  seo_article: 'bg-pink-100 text-pink-800',
};

export default function ContentHubPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', content: '', type: 'blog' as ContentItem['type'] });

  useEffect(() => {
    if (!workspaceId) return;
    getContent(workspaceId).then(setItems).finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateItem = async () => {
    if (!newItem.title.trim()) return;
    const item = await createContent(workspaceId, {
      workspace_id: workspaceId,
      type: newItem.type,
      title: newItem.title,
      slug: newItem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: newItem.content,
      tags: [],
      author_id: workspaceId,
      status: 'draft',
      seo: {},
    });
    setItems([item, ...items]);
    setShowCreateDialog(false);
    setNewItem({ title: '', content: '', type: 'blog' });
  };

  const handleDeleteItem = async (id: string) => {
    await deleteContent(workspaceId, id);
    setItems(items.filter(i => i.content_id !== id));
  };

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
  const stats = { total: items.length, published: items.filter(i => i.status === 'published').length, draft: items.filter(i => i.status === 'draft').length };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Content Hub</h1><p className="text-muted-foreground">Create and manage articles, guides, and pages</p></div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />New Content</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Published</p><p className="text-2xl font-bold">{stats.published}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Drafts</p><p className="text-2xl font-bold">{stats.draft}</p></CardContent></Card>
      </div>

      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No content yet</h3><Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Create Content</Button></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => (
            <Card key={item.content_id}>
              <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <Badge className={statusColors[item.status]}>{item.status}</Badge>
                    <Badge className={typeColors[item.type]}>{item.type.replace(/_/g, ' ')}</Badge>
                  </div>
                  {item.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>}
                </div>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteItem(item.content_id)}><Trash2 size={14} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create Content</h2>
            <div><label className="text-sm font-medium mb-2 block">Title *</label><Input placeholder="Title" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Type</label>
              <select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ContentItem['type'] })} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                <option value="blog">Blog</option><option value="landing_page">Landing Page</option><option value="case_study">Case Study</option><option value="newsletter">Newsletter</option><option value="knowledge_base">Knowledge Base</option><option value="seo_article">SEO Article</option>
              </select>
            </div>
            <div><label className="text-sm font-medium mb-2 block">Content</label><Textarea placeholder="Content..." value={newItem.content} onChange={(e) => setNewItem({ ...newItem, content: e.target.value })} rows={6} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreateItem}>Create</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
