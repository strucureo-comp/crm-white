'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, Plus, CheckCircle2, AlertCircle, X,
  Linkedin, Instagram, Twitter, Clock, Calendar, Check, TrendingUp, Link2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  subscribeToSocialData,
  createPost,
  updatePost,
  deletePost,
  updateAccount,
  ensureDefaultAccounts,
  type SocialAccount,
  type SocialPost as SocialPostType,
  type SocialPlatform,
} from '@/lib/db/social/api';

const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  switch (platform) {
    case 'linkedin': return <Linkedin className={className} />;
    case 'instagram': return <Instagram className={className} />;
    case 'twitter': return <Twitter className={className} />;
    default: return <Sparkles className={className} />;
  }
};

const PlatformTheme = (platform: string) => {
  switch (platform) {
    case 'linkedin': return 'bg-blue-600 text-white';
    case 'twitter': return 'bg-sky-500 text-white';
    case 'instagram': return 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white';
    default: return 'bg-slate-800 text-white';
  }
};

export default function SocialPage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPostType[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formPlatform, setFormPlatform] = useState<SocialPlatform>('linkedin');
  const [formContent, setFormContent] = useState('');
  const [formPublishMode, setFormPublishMode] = useState<'immediate' | 'queue'>('immediate');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');

  const [linkingPlatform, setLinkingPlatform] = useState<SocialPlatform | null>(null);
  const [linkHandle, setLinkHandle] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.company_id) return;
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      await ensureDefaultAccounts(user.company_id!);
      unsubscribe = subscribeToSocialData(user.company_id!, (data) => {
        setAccounts(data.accounts);
        setPosts(data.posts);
        setIsLoading(false);
      });
    };
    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.company_id]);

  const pendingPosts = posts.filter(p => p.status === 'pending');
  const publishedPosts = posts.filter(p => p.status === 'published');

  const totalFollowers = accounts.reduce((acc, a) => acc + a.followers, 0);
  const totalPostsThisMonth = accounts.reduce((acc, a) => acc + a.postsThisMonth, 0);
  const connectedCount = accounts.filter(a => a.connected).length;
  const avgEngagement = accounts.length > 0
    ? (accounts.reduce((acc, a) => acc + a.engagement, 0) / accounts.length).toFixed(1)
    : '0.0';

  const handleApprove = async (id: string) => {
    if (!user?.company_id) return;
    try {
      await updatePost(user.company_id, id, { status: 'published' });
      toast.success('Post approved and published!');
    } catch {
      toast.error('Failed to approve post');
    }
  };

  const handleReject = async (id: string) => {
    if (!user?.company_id) return;
    try {
      await deletePost(user.company_id, id);
      toast.success('Post rejected and removed.');
    } catch {
      toast.error('Failed to reject post');
    }
  };

  const handleDeletePublished = async (id: string) => {
    if (!user?.company_id) return;
    if (!confirm('Delete this published post?')) return;
    try {
      await deletePost(user.company_id, id);
      toast.success('Post deleted.');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleLinkAccount = async (platform: SocialPlatform) => {
    if (!user?.company_id) return;
    if (!linkHandle.trim()) {
      toast.error('Please enter your account handle');
      return;
    }
    setLinkingPlatform(null);
    try {
      const existing = accounts.find(a => a.platform === platform);
      if (existing) {
        await updateAccount(user.company_id, existing.id, {
          connected: true,
          handle: linkHandle.trim(),
          followers: 0,
          engagement: 0,
          postsThisMonth: 0,
          impressions: 0,
          growth: 0,
        });
      }
      toast.success(`${platform} account linked successfully!`);
    } catch {
      toast.error('Failed to link account');
    }
    setLinkHandle('');
  };

  const handleDisconnect = async (accountId: string, platform: string) => {
    if (!user?.company_id) return;
    if (!confirm(`Disconnect your ${platform} account?`)) return;
    try {
      await updateAccount(user.company_id, accountId, {
        connected: false,
        handle: '',
        followers: 0,
        engagement: 0,
        postsThisMonth: 0,
        impressions: 0,
        growth: 0,
      });
      toast.success(`${platform} account disconnected.`);
    } catch {
      toast.error('Failed to disconnect account');
    }
  };

  const handleCreatePost = async () => {
    if (!user?.company_id) return;
    if (!formContent.trim()) {
      toast.error('Post content is required');
      return;
    }
    if (formPublishMode === 'queue' && (!formDate || !formTime)) {
      toast.error('Date and time required for scheduling');
      return;
    }

    const newPost: Omit<SocialPostType, 'id'> = {
      platform: formPlatform,
      content: formContent,
      status: formPublishMode === 'immediate' ? 'published' : 'pending',
      scheduledTime: formPublishMode === 'immediate'
        ? new Date().toISOString()
        : `${formDate}T${formTime}:00Z`,
      createdAt: new Date().toISOString(),
        authorName: user?.full_name || user?.email || 'Unknown',
      likes: 0,
      comments: 0,
      shares: 0,
    };

    try {
      await createPost(user.company_id, newPost);
      setIsCreateOpen(false);
      toast.success(formPublishMode === 'immediate' ? 'Post published successfully!' : 'Post added to pending queue.');
      setFormContent('');
      setFormPublishMode('immediate');
      setFormDate('');
      setFormTime('');
    } catch {
      toast.error('Failed to create post');
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Social Media</h2>
              <Badge variant="secondary">Creator Suite</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Manage networks, engage audiences, and monitor brand growth</p>
          </div>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="h-10 px-6 font-semibold">
          <Plus className="w-4 h-4 mr-2" /> Create Post
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Followers</p>
                <p className="text-3xl font-bold mt-2">{totalFollowers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground font-medium mt-2">Across all connected accounts</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Posts This Month</p>
                <p className="text-3xl font-bold mt-2">{totalPostsThisMonth}</p>
                <p className="text-xs text-muted-foreground font-medium mt-2">Total published posts</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                <p className="text-3xl font-bold mt-2">{avgEngagement}%</p>
                <p className="text-xs text-muted-foreground font-medium mt-2">Across connected accounts</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-3xl font-bold">{pendingPosts.length}</p>
                  {pendingPosts.length > 0 && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">Action Required</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-2">Awaiting review</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2fr) */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Accounts Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Your Social Accounts</h3>
              <Badge variant="secondary">{connectedCount} of {accounts.length} Linked</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => (
                <Card key={acc.id} className="border shadow-sm overflow-hidden transition-all">
                  {acc.connected ? (
                    <>
                      <CardHeader className="p-4 pb-3 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${PlatformTheme(acc.platform)}`}>
                            <PlatformIcon platform={acc.platform} className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold capitalize">{acc.platform}</CardTitle>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 mt-0.5">Active</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-rose-600"
                          onClick={() => handleDisconnect(acc.id, acc.platform)}
                        >
                          Disconnect
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Followers</p>
                            <p className="font-semibold text-sm">{acc.followers.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Engagement</p>
                            <p className="font-semibold text-sm">{acc.engagement.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Impressions</p>
                            <p className="font-semibold text-sm">{(acc.impressions / 1000).toFixed(1)}k</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Posts (Mo)</p>
                            <p className="font-semibold text-sm">{acc.postsThisMonth}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold shadow-sm h-8" onClick={() => { setFormPlatform(acc.platform); setIsCreateOpen(true); }}>
                          <Plus className="w-3 h-3 mr-1.5" /> Post on <span className="capitalize ml-1">{acc.platform}</span>
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center relative">
                        <PlatformIcon platform={acc.platform} className="w-5 h-5 text-muted-foreground opacity-50" />
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-2">Offline</Badge>
                        <h4 className="font-bold text-sm">Integrate with <span className="capitalize">{acc.platform}</span></h4>
                        <p className="text-xs text-muted-foreground mt-1 px-4">Connect this account to start scheduling and analyzing posts.</p>
                      </div>
                      {linkingPlatform === acc.platform ? (
                        <div className="w-full space-y-2">
                          <Input
                            placeholder="Enter your @handle"
                            value={linkHandle}
                            onChange={e => setLinkHandle(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setLinkingPlatform(null); setLinkHandle(''); }}>
                              Cancel
                            </Button>
                            <Button size="sm" className="flex-1 text-xs" onClick={() => handleLinkAccount(acc.platform)}>
                              <Link2 className="w-3 h-3 mr-1" /> Link
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs font-semibold" onClick={() => setLinkingPlatform(acc.platform)}>
                          Link Account
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Latest Shared Posts */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Latest Shared Posts</h3>
            <div className="space-y-3">
              {publishedPosts.length === 0 ? (
                <div className="p-8 border border-dashed rounded-xl text-center flex flex-col items-center justify-center bg-muted/5">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-sm text-foreground">No published posts yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a post to get started.</p>
                </div>
              ) : (
                publishedPosts.map(post => (
                  <Card key={post.id} className="border shadow-sm bg-background hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${PlatformTheme(post.platform)}`}>
                        <PlatformIcon platform={post.platform} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> {new Date(post.scheduledTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pl-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Published
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600" onClick={() => handleDeletePublished(post.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pending Queue */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border shadow-sm bg-background h-[calc(100vh-140px)] flex flex-col">
            <CardHeader className="p-5 border-b bg-card">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  Pending Approvals
                  {pendingPosts.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">{pendingPosts.length} Actionable</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
              {pendingPosts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-70">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Queue is Clear!</h4>
                  <p className="text-sm text-muted-foreground">All pending posts have been reviewed.</p>
                </div>
              ) : (
                pendingPosts.map(post => (
                  <div key={post.id} className="bg-card border shadow-sm rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                    <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-sm flex items-center justify-center ${PlatformTheme(post.platform)}`}>
                          <PlatformIcon platform={post.platform} className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-bold capitalize">{post.platform}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="p-4 space-y-4">
                      <p className="text-sm line-clamp-4 leading-relaxed">{post.content}</p>
                      <div className="bg-muted/40 rounded-lg p-3 border border-dashed">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> Scheduled Time
                        </p>
                        <p className="text-xs font-semibold text-foreground">
                          {new Date(post.scheduledTime).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-border pt-px">
                      <Button variant="ghost" className="rounded-none rounded-bl-xl bg-background hover:bg-rose-50 hover:text-rose-600 h-10 font-bold" onClick={() => handleReject(post.id)}>
                        Reject
                      </Button>
                      <Button variant="ghost" className="rounded-none rounded-br-xl bg-background hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 h-10 font-bold" onClick={() => handleApprove(post.id)}>
                        Approve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create New Post Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-primary" /> Create New Post
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Platform</Label>
              <div className="grid grid-cols-3 gap-3">
                {(['linkedin', 'twitter', 'instagram'] as const).map(platform => (
                  <button
                    key={platform}
                    onClick={() => setFormPlatform(platform)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      formPlatform === platform
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/50'
                        : 'border-border hover:bg-muted/50 bg-card'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${PlatformTheme(platform)} ${formPlatform !== platform && 'opacity-50 grayscale'}`}>
                      <PlatformIcon platform={platform} className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold capitalize ${formPlatform === platform ? 'text-primary' : 'text-muted-foreground'}`}>
                      {platform}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post Content</Label>
              <Textarea
                placeholder="What do you want to share with your audience?"
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                className="h-32 resize-none"
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Publish Mode</Label>
              <div className="flex bg-muted/50 p-1 rounded-lg">
                <button
                  onClick={() => setFormPublishMode('immediate')}
                  className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${formPublishMode === 'immediate' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Publish Immediately
                </button>
                <button
                  onClick={() => setFormPublishMode('queue')}
                  className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${formPublishMode === 'queue' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Queue for Approval
                </button>
              </div>
            </div>

            {formPublishMode === 'queue' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Date</Label>
                  <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Time</Label>
                  <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-muted/10 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePost} className="font-bold px-8">
              {formPublishMode === 'immediate' ? 'Publish Now' : 'Schedule Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
