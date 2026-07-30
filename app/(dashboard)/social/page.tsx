'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, CheckCircle2, AlertCircle, X, ChevronDown, 
  Linkedin, Instagram, Twitter, Clock, Calendar, Check, TrendingUp, Users, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// --- Data Schemas ---
export interface Account {
  platform: 'linkedin' | 'instagram' | 'twitter';
  connected: boolean;
  followers: number;
  engagement: number;
  postsThisMonth: number;
  impressions: number;
  growth: number;
}

export interface Post {
  id: string;
  platform: 'linkedin' | 'instagram' | 'twitter';
  content: string;
  mediaUrl?: string | null;
  status: 'pending' | 'published';
  scheduledTime: string;
  createdAt: string;
}

// --- Mock Data ---
const MOCK_ACCOUNTS: Account[] = [
  { platform: 'linkedin', connected: true, followers: 15420, engagement: 4.2, postsThisMonth: 12, impressions: 45000, growth: 12.5 },
  { platform: 'twitter', connected: true, followers: 8200, engagement: 2.8, postsThisMonth: 28, impressions: 120000, growth: 5.2 },
  { platform: 'instagram', connected: false, followers: 0, engagement: 0, postsThisMonth: 0, impressions: 0, growth: 0 },
];

const MOCK_POSTS: Post[] = [
  { id: 'p1', platform: 'linkedin', content: 'Excited to announce our new Q3 features! 🚀 Check out the link in bio to learn how we are revolutionizing CRM workflows.', status: 'pending', scheduledTime: '2026-08-01T09:00:00Z', createdAt: '2026-07-30T10:00:00Z' },
  { id: 'p2', platform: 'twitter', content: 'Did you know? Teams using Tagverse see a 40% increase in productivity within the first month. #Productivity #SaaS', status: 'pending', scheduledTime: '2026-08-02T14:30:00Z', createdAt: '2026-07-30T11:00:00Z' },
  { id: 'p3', platform: 'linkedin', content: 'Great webinar today with the team! Thanks to everyone who joined us live.', status: 'published', scheduledTime: '2026-07-29T13:00:00Z', createdAt: '2026-07-28T09:00:00Z' },
];

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

export default function SocialPulsePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);

  // API Tools
  const [forceFailures, setForceFailures] = useState(false);
  const [latency, setLatency] = useState('0');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create Form State
  const [formPlatform, setFormPlatform] = useState<'linkedin' | 'instagram' | 'twitter'>('linkedin');
  const [formContent, setFormContent] = useState('');
  const [formPublishMode, setFormPublishMode] = useState<'immediate' | 'queue'>('immediate');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');

  useEffect(() => {
    setIsMounted(true);
    // Simulate loading for Skeleton
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Derived
  const pendingPosts = posts.filter(p => p.status === 'pending');
  const publishedPosts = posts.filter(p => p.status === 'published');
  
  const totalFollowers = accounts.reduce((acc, a) => acc + a.followers, 0);
  const totalPostsThisMonth = accounts.reduce((acc, a) => acc + a.postsThisMonth, 0);
  const connectedCount = accounts.filter(a => a.connected).length;

  // Handlers
  const handleApprove = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'published' } : p));
    toast.success('Post approved and scheduled!', {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    });
  };

  const handleReject = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    toast.error('Post rejected and removed from queue.', {
      icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
      className: 'bg-rose-50 text-rose-700 border-rose-200'
    });
  };

  const handleCreatePost = () => {
    if (!formContent.trim()) return toast.error('Post content is required');
    if (formPublishMode === 'queue' && (!formDate || !formTime)) return toast.error('Date and time required for scheduling');

    const newPost: Post = {
      id: `p${Date.now()}`,
      platform: formPlatform,
      content: formContent,
      status: formPublishMode === 'immediate' ? 'published' : 'pending',
      scheduledTime: formPublishMode === 'immediate' ? new Date().toISOString() : `${formDate}T${formTime}:00Z`,
      createdAt: new Date().toISOString()
    };

    setPosts(prev => [newPost, ...prev]);
    setIsCreateOpen(false);
    toast.success(formPublishMode === 'immediate' ? 'Post published successfully!' : 'Post added to pending queue.', {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    });

    // Reset
    setFormContent('');
    setFormPublishMode('immediate');
    setFormDate('');
    setFormTime('');
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      
      {/* 2. Global Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">SocialPulse</h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Enterprise Creator Suite</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Manage networks, engage audiences, and monitor brand growth</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <Card className="bg-muted/30 border-dashed shadow-none p-2 flex items-center gap-4 h-10">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="fail" checked={forceFailures} onChange={e => setForceFailures(e.target.checked)} className="rounded border-muted-foreground" />
              <label htmlFor="fail" className="text-[10px] uppercase font-bold text-muted-foreground cursor-pointer">Force Failures</label>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Latency</Label>
              <Select value={latency} onValueChange={setLatency}>
                <SelectTrigger className="h-6 w-[80px] text-[10px] bg-background border-muted-foreground/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0ms</SelectItem>
                  <SelectItem value="500">500ms</SelectItem>
                  <SelectItem value="2000">2000ms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
          
          <Button onClick={() => setIsCreateOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg border-0 h-10 px-6 font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Create Post
          </Button>
        </div>
      </div>

      {/* 3. KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border shadow-sm overflow-hidden"><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-4" /><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-32" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card className="border shadow-sm overflow-hidden relative">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Followers</p>
                <p className="text-3xl font-bold mt-2">{totalFollowers.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> ↑ 12.5% vs last month</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm overflow-hidden relative">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Posts This Month</p>
                <p className="text-3xl font-bold mt-2">{totalPostsThisMonth}</p>
                <p className="text-xs text-muted-foreground font-medium mt-2">Target: 40 posts</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm overflow-hidden relative">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                <p className="text-3xl font-bold mt-2">3.5%</p>
                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> ↑ 1.2% industry avg</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm overflow-hidden relative bg-gradient-to-br from-background to-amber-50/30 dark:to-amber-900/10">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-3xl font-bold">{pendingPosts.length}</p>
                  {pendingPosts.length > 0 && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 animate-pulse">Action Required</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-2">Awaiting review</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 4. Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* A. Left Column (2fr) */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          
          {/* Accounts Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Your Social Accounts</h3>
              <Badge variant="secondary" className="bg-muted text-muted-foreground">{connectedCount} of {accounts.length} Linked</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => (
                <Card key={acc.platform} className={`border shadow-sm overflow-hidden transition-all ${acc.connected ? 'bg-background' : 'bg-muted/20 border-dashed opacity-80'}`}>
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
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-rose-600">Disconnect</Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Followers</p>
                            <p className="font-semibold text-sm">{acc.followers.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Engagement</p>
                            <p className="font-semibold text-sm">{acc.engagement}%</p>
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
                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-muted-foreground">Follower Goal Progress</span>
                            <span className="text-primary">65%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold shadow-sm h-8" onClick={() => setIsCreateOpen(true)}>
                          <Plus className="w-3 h-3 mr-1.5" /> Post on <span className="capitalize ml-1">{acc.platform}</span>
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center relative">
                        <PlatformIcon platform={acc.platform} className="w-5 h-5 text-muted-foreground opacity-50" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center shadow-sm border">
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-2">Offline</Badge>
                        <h4 className="font-bold text-sm">Integrate with <span className="capitalize">{acc.platform}</span></h4>
                        <p className="text-xs text-muted-foreground mt-1 px-4">Connect this account to start scheduling and analyzing posts.</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs font-semibold">Link Account</Button>
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
                  <p className="font-semibold text-sm text-foreground">No successfully approved or active posts listed yet.</p>
                </div>
              ) : (
                publishedPosts.map(post => (
                  <Card key={post.id} className="border shadow-sm bg-background hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${PlatformTheme(post.platform)}`}>
                        <PlatformIcon platform={post.platform} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> Published/Scheduled: {new Date(post.scheduledTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pl-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Queue Confirmed
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* B. Right Column (Pending Queue) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border shadow-lg bg-background/50 backdrop-blur-sm h-[calc(100vh-140px)] flex flex-col">
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
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Queue is Clear!</h4>
                  <p className="text-sm text-muted-foreground">All pending posts have been reviewed and approved.</p>
                </div>
              ) : (
                pendingPosts.map(post => (
                  <div key={post.id} className="bg-card border shadow-sm rounded-xl overflow-hidden hover:border-primary/30 transition-colors group">
                    <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-sm flex items-center justify-center ${PlatformTheme(post.platform)}`}>
                          <PlatformIcon platform={post.platform} className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-bold capitalize">{post.platform}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">Created {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                      <Button variant="ghost" className="rounded-none rounded-br-xl bg-background hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 h-10 font-bold" onClick={() => handleApprove(post.id)}>
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

      {/* 5. Create New Post Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px] bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-5 h-5 text-indigo-500" /> Create New Post
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
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm ring-1 ring-indigo-500/50' 
                        : 'border-border hover:bg-muted/50 bg-card'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${PlatformTheme(platform)} ${formPlatform !== platform && 'opacity-50 grayscale'}`}>
                      <PlatformIcon platform={platform} className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold capitalize ${formPlatform === platform ? 'text-indigo-700 dark:text-indigo-400' : 'text-muted-foreground'}`}>
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
                className="h-32 resize-none bg-background focus-visible:ring-indigo-500"
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
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Date</Label>
                  <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="bg-background focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Time</Label>
                  <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="bg-background focus-visible:ring-indigo-500" />
                </div>
              </div>
            )}

          </div>
          
          <DialogFooter className="p-6 pt-4 border-t bg-muted/10 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePost} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md border-0 font-bold px-8">
              {formPublishMode === 'immediate' ? 'Publish Now' : 'Schedule Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
