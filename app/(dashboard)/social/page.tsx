'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
  Image,
  Linkedin,
  Twitter,
  Youtube,
  Calendar,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getSocialPosts, deleteSocialPost } from '@/lib/firebase/database';
import type { SocialPost, SocialPlatform } from '@/lib/db/types';
import { SocialPostDialog } from '@/components/dialogs/social-post-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <Video size={14} />,
  instagram: <Image size={14} />,
  linkedin: <Linkedin size={14} />,
  twitter: <Twitter size={14} />,
  youtube: <Youtube size={14} />,
};

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  instagram: 'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
  linkedin: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  twitter: 'bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400',
  youtube: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  published: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failed: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  publishing: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const data = await getSocialPosts();
      setPosts(data);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = posts.filter((p) => {
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.content.toLowerCase().includes(s);
    }
    return true;
  });

  async function handleDelete(p: SocialPost) {
    setConfirmState({ open: true, id: p.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteSocialPost(confirmState.id);
      toast.success('Post deleted');
      load();
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setConfirmState({ open: false });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading social posts...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Social Media</h2>
          <p className="text-sm text-muted-foreground">Schedule and manage social media posts</p>
        </div>
        <Button onClick={() => { setEditingPost(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          New Post
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search posts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={filtered}
              keyExtractor={(p) => p.id}
              mobileCardTitle={(p) => p.content.slice(0, 50)}
              columns={[
                {
                  key: 'platform',
                  header: 'Platform',
                  render: (p) => (
                    <Badge variant="secondary" className={`flex items-center gap-1.5 ${platformColors[p.platform] || ''}`}>
                      {platformIcons[p.platform]}
                      {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                    </Badge>
                  ),
                },
                {
                  key: 'content',
                  header: 'Content',
                  render: (p) => (
                    <div className="min-w-0 max-w-[300px]">
                      <p className="text-sm truncate">{p.content}</p>
                    </div>
                  ),
                },
                {
                  key: 'scheduled_at',
                  header: 'Scheduled',
                  render: (p) => (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar size={12} />
                      <span>{formatDate(p.scheduled_at)}</span>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (p) => (
                    <Badge variant="secondary" className={statusColors[p.status] || ''}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-10',
                  render: (p) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Post actions">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingPost(p); setDialogOpen(true); }}>
                          <Pencil size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p)}>
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No social posts yet</p></CardContent></Card>
      )}

      <SocialPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        post={editingPost}
      />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
