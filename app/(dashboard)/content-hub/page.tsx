'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, Search, Filter, MoreHorizontal, MessageSquare, Clock, 
  AlignLeft, Calendar, FileText, CheckCircle2, CircleDashed, 
  Users, Play, Send, Inbox, ArrowRight, GripVertical, Pencil, Trash2, X, Settings2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// --- Types ---
type Comment = { id: string; author: string; avatar: string; text: string; date: string };
type HistoryEntry = { date: string; action: string; user: string };
type ContentItem = {
  id: string; title: string; type: string; campaign: string;
  funnelStage: string; persona: string; author: string; owner: string;
  lastEdited: string; status: string; priority: string; dueDate: string;
  description: string; comments: Comment[]; history: HistoryEntry[];
};
type StageInfo = { id: string; label: string; dotColor: string; order: number; };

// --- Mock Data ---
const CONTENT_TYPES = [
  { label: 'Blog', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Email', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { label: 'Newsletter', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { label: 'Landing Page', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Case Study', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Social Post', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'Ad Copy', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { label: 'Video Script', color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'WhatsApp Template', color: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Knowledge Base', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const DEFAULT_STAGES: StageInfo[] = [
  { id: 'ideas', label: 'Ideas', dotColor: 'bg-slate-400', order: 0 },
  { id: 'draft', label: 'Draft', dotColor: 'bg-amber-400', order: 1 },
  { id: 'review', label: 'In Review', dotColor: 'bg-blue-400', order: 2 },
  { id: 'approved', label: 'Approved', dotColor: 'bg-emerald-400', order: 3 },
  { id: 'scheduled', label: 'Scheduled', dotColor: 'bg-purple-400', order: 4 },
  { id: 'published', label: 'Published', dotColor: 'bg-rose-400', order: 5 },
];

const FUNNELS = ['Awareness', 'Consideration', 'Decision', 'Retention'];
const PERSONAS = ['Founder', 'CEO', 'Marketing Manager', 'Sales Manager', 'Agency Owner', 'Developer', 'Customer'];
const CAMPAIGNS = ['Summer Product Launch 2026', 'Inbound SEO Engine', 'Customer Success Highlights', 'SaaS Growth Playbook', 'Lead Gen Q2', 'Re-engagement Campaign'];

const INITIAL_DATA: ContentItem[] = [
  {
    id: '1', title: 'Top 10 SaaS Growth Strategies', type: 'Blog', campaign: 'SaaS Growth Playbook',
    funnelStage: 'Awareness', persona: 'Founder', author: 'Alex Rivera', owner: 'Alex Rivera',
    lastEdited: '2026-07-28', status: 'draft', priority: 'High', dueDate: '2026-08-05',
    description: 'A comprehensive guide on growing a SaaS startup in 2026.',
    comments: [{ id: 'c1', author: 'Sarah', avatar: 'S', text: 'Looks good so far!', date: '2026-07-28' }],
    history: [{ date: '2026-07-28', action: 'Created draft', user: 'Alex Rivera' }]
  },
  {
    id: '2', title: 'Q2 Feature Highlights', type: 'Newsletter', campaign: 'Customer Success Highlights',
    funnelStage: 'Retention', persona: 'Customer', author: 'Jamie Doe', owner: 'Jamie Doe',
    lastEdited: '2026-07-29', status: 'ideas', priority: 'Medium', dueDate: '2026-08-10',
    description: 'Highlighting the new features shipped in Q2.',
    comments: [], history: [{ date: '2026-07-29', action: 'Added to Ideas', user: 'Jamie Doe' }]
  },
  {
    id: '3', title: 'How to automate workflows', type: 'Video Script', campaign: 'Inbound SEO Engine',
    funnelStage: 'Consideration', persona: 'Marketing Manager', author: 'Sam Smith', owner: 'Sam Smith',
    lastEdited: '2026-07-25', status: 'review', priority: 'High', dueDate: '2026-08-01',
    description: 'Script for our upcoming YouTube video on workflow automation.',
    comments: [], history: []
  }
];

export default function ContentHubPage() {
  const [items, setItems] = useState<ContentItem[]>(INITIAL_DATA);
  const [stages, setStages] = useState<StageInfo[]>(DEFAULT_STAGES);
  
  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterStage, setFilterStage] = useState('all');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('Blog');
  const [formCampaign, setFormCampaign] = useState(CAMPAIGNS[0]);
  const [formPriority, setFormPriority] = useState('Medium');
  const [formStage, setFormStage] = useState('ideas');
  const [formDescription, setFormDescription] = useState('');

  // Comment Form State
  const [commentText, setCommentText] = useState('');

  // Ensure hydration match
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesCampaign = filterCampaign === 'all' || item.campaign === filterCampaign;
    const matchesStage = filterStage === 'all' || item.status === filterStage;
    return matchesSearch && matchesType && matchesCampaign && matchesStage;
  });

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'stage') {
      const newStages = Array.from(stages);
      const [reorderedItem] = newStages.splice(source.index, 1);
      newStages.splice(destination.index, 0, reorderedItem);
      setStages(newStages.map((s, i) => ({ ...s, order: i })));
      return;
    }

    if (type === 'card') {
      if (source.droppableId !== destination.droppableId) {
        setItems(prev => {
          const newItems = [...prev];
          const itemIndex = newItems.findIndex(i => i.id === draggableId);
          if (itemIndex >= 0) {
            newItems[itemIndex] = { ...newItems[itemIndex], status: destination.droppableId };
            newItems[itemIndex].history.push({
              date: new Date().toISOString().split('T')[0],
              action: `Moved from ${stages.find(s=>s.id === source.droppableId)?.label} to ${stages.find(s=>s.id === destination.droppableId)?.label}`,
              user: 'Current User'
            });
          }
          return newItems;
        });
        toast.success(`Moved to ${stages.find(s => s.id === destination.droppableId)?.label}`);
      }
    }
  };

  const openCreateModal = (item?: ContentItem) => {
    if (item) {
      setEditingItem(item);
      setFormTitle(item.title);
      setFormType(item.type);
      setFormCampaign(item.campaign);
      setFormPriority(item.priority);
      setFormStage(item.status);
      setFormDescription(item.description);
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormType('Blog');
      setFormCampaign(CAMPAIGNS[0]);
      setFormPriority('Medium');
      setFormStage('ideas');
      setFormDescription('');
    }
    setIsCreateModalOpen(true);
  };

  const saveContentItem = () => {
    if (!formTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? {
        ...i,
        title: formTitle,
        type: formType,
        campaign: formCampaign,
        priority: formPriority,
        status: formStage,
        description: formDescription,
        lastEdited: new Date().toISOString().split('T')[0],
        history: [...i.history, { date: new Date().toISOString().split('T')[0], action: 'Updated details', user: 'Current User' }]
      } : i));
      if (selectedItem && selectedItem.id === editingItem.id) {
        const updated = {
          ...selectedItem,
          title: formTitle,
          type: formType,
          campaign: formCampaign,
          priority: formPriority,
          status: formStage,
          description: formDescription,
          history: [...selectedItem.history, { date: new Date().toISOString().split('T')[0], action: 'Updated details', user: 'Current User' }]
        };
        setSelectedItem(updated);
      }
      toast.success('Content updated');
    } else {
      const newItem: ContentItem = {
        id: Date.now().toString(),
        title: formTitle,
        type: formType,
        campaign: formCampaign,
        priority: formPriority,
        status: formStage,
        description: formDescription,
        funnelStage: FUNNELS[0],
        persona: PERSONAS[0],
        author: 'Current User',
        owner: 'Current User',
        lastEdited: new Date().toISOString().split('T')[0],
        dueDate: '',
        comments: [],
        history: [{ date: new Date().toISOString().split('T')[0], action: 'Created item', user: 'Current User' }]
      };
      setItems(prev => [...prev, newItem]);
      toast.success('Content created');
    }
    setIsCreateModalOpen(false);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Content deleted');
    if (selectedItem?.id === id) {
      setIsDetailDrawerOpen(false);
    }
  };

  const addComment = () => {
    if (!commentText.trim() || !selectedItem) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      avatar: 'C',
      text: commentText,
      date: new Date().toISOString().split('T')[0]
    };
    
    setItems(prev => prev.map(i => i.id === selectedItem.id ? {
      ...i, 
      comments: [...i.comments, newComment],
      history: [...i.history, { date: new Date().toISOString().split('T')[0], action: 'Added comment', user: 'Current User' }]
    } : i));
    
    setSelectedItem(prev => prev ? {
      ...prev, 
      comments: [...prev.comments, newComment],
      history: [...prev.history, { date: new Date().toISOString().split('T')[0], action: 'Added comment', user: 'Current User' }]
    } : null);
    
    setCommentText('');
  };

  const getBadgeStyle = (type: string) => {
    const found = CONTENT_TYPES.find(c => c.label === type);
    return found ? found.color : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Hub</h2>
          <p className="text-sm text-muted-foreground">Manage your content pipeline and campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreateModal()}>
            <Plus size={16} className="mr-2" />
            Create New
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b pb-2 mb-4 shrink-0">
          <TabsList className="bg-transparent p-0 space-x-4">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2">
              Library
            </TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2">
              Approvals
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search content..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTENT_TYPES.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {CAMPAIGNS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="pipeline" className="flex-1 min-h-0 border-0 p-0 m-0 overflow-hidden outline-none">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" type="stage" direction="horizontal">
              {(provided) => (
                <div 
                  className="flex gap-4 overflow-x-auto h-full pb-4 items-start"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {stages.map((stage, index) => {
                    const stageItems = filteredItems.filter(i => i.status === stage.id);
                    
                    return (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex-shrink-0 w-[320px] flex flex-col bg-muted/30 rounded-xl p-3 transition-colors border border-transparent ${snapshot.isDragging ? 'bg-muted/50 border-muted shadow-lg ring-1 ring-primary/20 rotate-1' : ''}`}
                            style={{ maxHeight: '100%', ...provided.draggableProps.style }}
                          >
                            <div 
                              className="flex items-center justify-between mb-4 px-1 group cursor-grab active:cursor-grabbing shrink-0"
                              {...provided.dragHandleProps}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                                <h3 className="font-semibold text-sm tracking-wide">{stage.label}</h3>
                                <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full shadow-sm">
                                  {stageItems.length}
                                </span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setFormStage(stage.id); openCreateModal(); }}>
                                <Plus size={14} />
                              </Button>
                            </div>
                            
                            <Droppable droppableId={stage.id} type="card">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors rounded-lg p-1 ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                                >
                                  {stageItems.map((item, itemIndex) => (
                                    <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                      {(provided, snapshot) => (
                                        <Card
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          onClick={() => { setSelectedItem(item); setIsDetailDrawerOpen(true); }}
                                          className={`cursor-pointer transition-all border shadow-sm hover:shadow-md bg-background/95 backdrop-blur-sm
                                            ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 rotate-2 scale-[1.02] bg-background' : 'hover:border-primary/30'}
                                          `}
                                          style={{...provided.draggableProps.style}}
                                        >
                                          <CardContent className="p-3.5 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${getBadgeStyle(item.type)} border`}>
                                                {item.type}
                                              </Badge>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal size={14} />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                                                  <DropdownMenuItem onClick={() => openCreateModal(item)}>
                                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-red-600" onClick={() => deleteItem(item.id)}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                            
                                            <div>
                                              <h4 className="text-sm font-semibold leading-tight line-clamp-2">{item.title}</h4>
                                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{item.campaign}</p>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <AlignLeft size={13} className={item.description ? 'text-primary/60' : 'opacity-30'} />
                                                <div className="flex items-center gap-1">
                                                  <MessageSquare size={13} className={item.comments.length > 0 ? 'text-blue-500/70' : 'opacity-30'} />
                                                  {item.comments.length > 0 && <span className="text-[10px]">{item.comments.length}</span>}
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                {item.priority === 'High' && (
                                                  <span className="flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-500/20" title="High Priority" />
                                                )}
                                                <Avatar className="h-6 w-6 border shadow-sm">
                                                  <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                                                    {item.owner.substring(0, 2).toUpperCase()}
                                                  </AvatarFallback>
                                                </Avatar>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  
                                  {stageItems.length === 0 && (
                                    <div 
                                      className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center cursor-pointer hover:bg-muted/40 transition-colors mt-2"
                                      onClick={() => { setFormStage(stage.id); openCreateModal(); }}
                                    >
                                      <p className="text-xs text-muted-foreground/70 font-medium">Drop items here</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  
                  <div className="flex-shrink-0 w-[300px]">
                    <Button variant="outline" className="w-full h-[50px] border-dashed border-2 hover:bg-muted/50 bg-transparent text-muted-foreground transition-all group">
                      <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                      Add Column
                    </Button>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="library">
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 h-full flex flex-col items-center justify-center">
            <Inbox className="h-12 w-12 mb-4 text-muted-foreground/40" />
            <p>Library View (Grid/Table) - Coming Soon</p>
          </div>
        </TabsContent>
        <TabsContent value="approvals">
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 h-full flex flex-col items-center justify-center">
            <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground/40" />
            <p>Approvals View - Coming Soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Slide-out Drawer */}
      <Sheet open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-xl p-0 flex flex-col h-full bg-background/95 backdrop-blur-xl">
          {selectedItem && (
            <>
              <SheetHeader className="p-6 border-b pb-4 bg-background z-10 sticky top-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 pr-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-xs ${getBadgeStyle(selectedItem.type)}`}>
                        {selectedItem.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                        {stages.find(s => s.id === selectedItem.status)?.label}
                      </Badge>
                    </div>
                    <SheetTitle className="text-xl leading-tight">{selectedItem.title}</SheetTitle>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setIsDetailDrawerOpen(false); openCreateModal(selectedItem); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteItem(selectedItem.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                  <Select value={selectedItem.status} onValueChange={(val) => {
                    setItems(prev => prev.map(i => i.id === selectedItem.id ? {
                      ...i, 
                      status: val,
                      history: [...i.history, { date: new Date().toISOString().split('T')[0], action: `Changed status to ${stages.find(s=>s.id === val)?.label}`, user: 'Current User' }]
                    } : i));
                    setSelectedItem(prev => prev ? {
                      ...prev, 
                      status: val,
                      history: [...prev.history, { date: new Date().toISOString().split('T')[0], action: `Changed status to ${stages.find(s=>s.id === val)?.label}`, user: 'Current User' }]
                    } : null);
                    toast.success('Status updated');
                  }}>
                    <SelectTrigger className="h-8 text-xs w-[140px] ml-auto font-medium">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="general" className="h-full flex flex-col">
                  <div className="px-6 border-b bg-background/50 sticky top-0 z-10 backdrop-blur-md">
                    <TabsList className="bg-transparent h-12 w-full justify-start space-x-6 p-0">
                      <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full font-medium">General</TabsTrigger>
                      <TabsTrigger value="collaboration" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-1.5 font-medium">
                        Collaboration
                        {selectedItem.comments.length > 0 && (
                          <span className="bg-primary/10 text-primary text-[10px] py-0.5 px-1.5 rounded-full">{selectedItem.comments.length}</span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full font-medium">Timeline</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="general" className="p-6 space-y-8 mt-0">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><AlignLeft size={16} className="text-muted-foreground" /> Description</h4>
                      <div className="text-sm text-foreground bg-muted/30 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                        {selectedItem.description || 'No description provided.'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-transparent">
                        <span className="text-xs text-muted-foreground font-medium">Campaign</span>
                        <p className="text-sm font-medium">{selectedItem.campaign}</p>
                      </div>
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-transparent">
                        <span className="text-xs text-muted-foreground font-medium">Owner</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{selectedItem.owner.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <p className="text-sm font-medium">{selectedItem.owner}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-transparent">
                        <span className="text-xs text-muted-foreground font-medium">Priority</span>
                        <div>
                          <Badge variant={selectedItem.priority === 'High' ? 'destructive' : 'secondary'} className="font-normal shadow-sm">
                            {selectedItem.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-transparent">
                        <span className="text-xs text-muted-foreground font-medium">Due Date</span>
                        <p className="text-sm font-medium flex items-center gap-1.5"><Calendar size={14} className="text-muted-foreground" /> {selectedItem.dueDate || 'Not set'}</p>
                      </div>
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-transparent">
                        <span className="text-xs text-muted-foreground font-medium">Funnel Stage</span>
                        <p className="text-sm font-medium">{selectedItem.funnelStage}</p>
                      </div>
                      <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-transparent">
                        <span className="text-xs text-muted-foreground font-medium">Target Persona</span>
                        <p className="text-sm font-medium">{selectedItem.persona}</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="collaboration" className="p-6 flex flex-col h-[calc(100vh-220px)] mt-0 space-y-4">
                    <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                      {selectedItem.comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
                          <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">No comments yet. Start the discussion!</p>
                        </div>
                      ) : (
                        selectedItem.comments.map(c => (
                          <div key={c.id} className="flex gap-3">
                            <Avatar className="h-8 w-8 shadow-sm"><AvatarFallback className="bg-primary/10 text-primary text-xs">{c.avatar}</AvatarFallback></Avatar>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{c.author}</span>
                                <span className="text-[10px] text-muted-foreground">{c.date}</span>
                              </div>
                              <div className="text-sm bg-muted/40 border p-3 rounded-tr-xl rounded-b-xl rounded-bl-sm leading-relaxed text-foreground/90">
                                {c.text}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="pt-4 border-t shrink-0">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Write a comment..." 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter') addComment(); }}
                          className="bg-muted/30 focus-visible:ring-1"
                        />
                        <Button size="icon" onClick={addComment} disabled={!commentText.trim()} className="shrink-0">
                          <Send size={16} />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="p-6 mt-0">
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                      {selectedItem.history.map((h, i) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_0_4px_var(--background)]">
                            <Clock size={16} />
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-background shadow-sm space-y-1 hover:border-primary/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-primary">{h.user}</span>
                              <span className="text-[10px] text-muted-foreground font-medium">{h.date}</span>
                            </div>
                            <p className="text-sm text-foreground/80">{h.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl">{editingItem ? 'Edit Content' : 'Create New Content'}</DialogTitle>
            <DialogDescription>
              Fill out the details below to add or modify a content item in your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. 10 Tips for SEO in 2026" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="bg-muted/40" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campaign</Label>
                <Select value={formCampaign} onValueChange={setFormCampaign}>
                  <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGNS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Initial Stage</Label>
                <Select value={formStage} onValueChange={setFormStage}>
                  <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea 
                id="desc" 
                placeholder="Briefly describe what this content is about..." 
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
                className="resize-none h-24 bg-muted/40"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={saveContentItem}>{editingItem ? 'Save Changes' : 'Create Content'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
