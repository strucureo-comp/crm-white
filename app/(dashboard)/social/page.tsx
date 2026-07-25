'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Trash2, Eye, Heart, MessageCircle, Share2, Globe, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getSocialPosts, createSocialPost, updateSocialPost, deleteSocialPost } from '@/lib/db/automation/api';
import { SocialPost, SocialPlatform } from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const platformColors: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-800',
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  linkedin: 'bg-blue-100 text-blue-800',
  youtube: 'bg-red-100 text-red-800',
  pinterest: 'bg-red-100 text-red-800',
  threads: 'bg-gray-100 text-gray-800',
};

export default function SocialMediaPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    platform: '' as SocialPlatform,
    hashtags: '',
  });

  useEffect(() => {
    if (!workspaceId) return;
    getSocialPosts(workspaceId).then(setPosts).finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreatePost = async () => {
    if (!newPost.content.trim() || !newPost.platform) return;
    const post = await createSocialPost(workspaceId, {
      workspace_id: workspaceId,
      platform: newPost.platform,
      content: newPost.content,
      media_urls: [],
      hashtags: newPost.hashtags ? newPost.hashtags.split(',').map(s => s.trim()) : [],
      status: 'draft',
      metrics: { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0, engagement_rate: 0 },
    });
    setPosts([post, ...posts]);
    setShowCreateDialog(false);
    setNewPost({ content: '', platform: '' as SocialPlatform, hashtags: '' });
  };

  const handleDeletePost = async (id: string) => {
    await deleteSocialPost(workspaceId, id);
    setPosts(posts.filter(p => p.post_id !== id));
  };

  const filtered = posts.filter(p => p.content.toLowerCase().includes(search.toLowerCase()));
  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    totalEngagement: posts.reduce((s, p) => s + (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.shares || 0), 0),
    totalReach: posts.reduce((s, p) => s + (p.metrics?.reach || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground">Create, schedule, and manage social posts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />New Post</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Posts</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Published</p><p className="text-2xl font-bold">{stats.published}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Engagement</p><p className="text-2xl font-bold">{stats.totalEngagement.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Reach</p><p className="text-2xl font-bold">{stats.totalReach.toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No posts yet</h3><Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Create Post</Button></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <Card key={post.post_id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={platformColors[post.platform]}>{post.platform}</Badge>
                      <Badge className={statusColors[post.status]}>{post.status}</Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">{post.hashtags.map(h => <Badge key={h} variant="outline">#{h}</Badge>)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 lg:min-w-[300px]">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><Heart size={14} />{post.metrics?.likes || 0}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><MessageCircle size={14} />{post.metrics?.comments || 0}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><Share2 size={14} />{post.metrics?.shares || 0}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><Eye size={14} />{post.metrics?.impressions || 0}</div>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePost(post.post_id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create New Post</h2>
            <div><label className="text-sm font-medium mb-2 block">Platform *</label>
              <select value={newPost.platform} onChange={(e) => setNewPost({ ...newPost, platform: e.target.value as SocialPlatform })} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                <option value="">Select platform</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="twitter">Twitter</option><option value="youtube">YouTube</option><option value="pinterest">Pinterest</option><option value="threads">Threads</option>
              </select>
            </div>
            <div><label className="text-sm font-medium mb-2 block">Content *</label><Textarea placeholder="Post content..." value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} rows={4} /></div>
            <div><label className="text-sm font-medium mb-2 block">Hashtags (comma separated)</label><Input placeholder="hashtag1, hashtag2" value={newPost.hashtags} onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreatePost}>Create</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
