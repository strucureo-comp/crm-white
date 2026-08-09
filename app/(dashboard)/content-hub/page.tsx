'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, Search, Filter, MoreHorizontal, MessageSquare, Clock, 
  AlignLeft, Calendar, FileText, CheckCircle2, CircleDashed, 
  Users, Play, Send, Inbox, ArrowRight, GripVertical, Pencil, Trash2, X, Settings2,
  ChevronLeft, ChevronRight, Check, AlertCircle
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
import { useAuth } from '@/lib/firebase/auth-context';
import { createContentItem, updateContentItem, deleteContentItem, subscribeToContentHub, ContentItem, Comment, HistoryEntry } from '@/lib/db/content-hub/api';

// --- Types ---
type StageInfo = { id: string; label: string; dotColor: string; order: number; };

// --- Constants & Data Setup ---
const CONTENT_TYPES = [
  { label: 'Blog', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Email', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Newsletter', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Landing Page', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Case Study', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Social Post', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Ad Copy', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Video Script', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'WhatsApp Template', color: 'bg-muted text-muted-foreground border-border' },
  { label: 'Knowledge Base', color: 'bg-muted text-muted-foreground border-border' },
];

const DEFAULT_STAGES: StageInfo[] = [
  { id: 'Ideas', label: 'Ideas', dotColor: 'bg-muted-foreground', order: 0 },
  { id: 'Draft', label: 'Draft', dotColor: 'bg-muted-foreground', order: 1 },
  { id: 'In Review', label: 'In Review', dotColor: 'bg-muted-foreground', order: 2 },
  { id: 'Approved', label: 'Approved', dotColor: 'bg-muted-foreground', order: 3 },
  { id: 'Scheduled', label: 'Scheduled', dotColor: 'bg-muted-foreground', order: 4 },
  { id: 'Published', label: 'Published', dotColor: 'bg-muted-foreground', order: 5 },
  { id: 'Archived', label: 'Archived', dotColor: 'bg-muted-foreground', order: 6 },
];

const PERSONAS = ['Founder', 'CEO', 'Marketing Manager', 'Sales Manager', 'Agency Owner', 'Developer', 'Customer'];

const INITIAL_DATA: ContentItem[] = [];

export default function ContentHubPage() {
  const { workspace, user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Global State
  const [items, setItems] = useState<ContentItem[]>(INITIAL_DATA);
  
  useEffect(() => {
    if (!workspace?.id) return;
    const unsubscribe = subscribeToContentHub(workspace?.id, (data) => {
      setItems(data);
      setSelectedItem(prev => data.find(i => i.id === prev?.id) || null);
    });
    return () => unsubscribe();
  }, [workspace?.id]);
  const [stages, setStages] = useState<StageInfo[]>(DEFAULT_STAGES);
  const [activeTab, setActiveTab] = useState('pipeline');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Pipeline Filters
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineCampaign, setPipelineCampaign] = useState('all');

  // Library Filters
  const [libSearch, setLibSearch] = useState('');
  const [libType, setLibType] = useState('all');
  const [libStage, setLibStage] = useState('all');
  const [libFunnel, setLibFunnel] = useState('all');
  const [libPersona, setLibPersona] = useState('all');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('Blog');
  const [formCampaign, setFormCampaign] = useState('');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formStage, setFormStage] = useState('Ideas');
  const [formDescription, setFormDescription] = useState('');
  const [formPersona, setFormPersona] = useState(PERSONAS[0]);
  const [formDueDate, setFormDueDate] = useState('');

  // Approvals State
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Comment Form State
  const [commentText, setCommentText] = useState('');

  // --- Derived Data ---
  const uniqueCampaigns = useMemo(() => Array.from(new Set(items.map(i => i.campaign).filter(Boolean))), [items]);
  const inReviewCount = items.filter(i => i.status === 'In Review').length;

  const pipelineItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(pipelineSearch.toLowerCase());
      const matchesCampaign = pipelineCampaign === 'all' || item.campaign === pipelineCampaign;
      return matchesSearch && matchesCampaign;
    });
  }, [items, pipelineSearch, pipelineCampaign]);

  const libraryItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(libSearch.toLowerCase());
      const matchesType = libType === 'all' || item.type === libType;
      const matchesStage = libStage === 'all' || item.status === libStage;
      const matchesPersona = libPersona === 'all' || item.persona === libPersona;
      return matchesSearch && matchesType && matchesStage && matchesPersona;
    });
  }, [items, libSearch, libType, libStage, libPersona]);

  const approvalItems = useMemo(() => {
    return items.filter(item => item.status === 'In Review');
  }, [items]);

  // --- Functions ---
  const updateItemStatus = async (id: string, newStatus: string, actionNote: string) => {
    if (!workspace?.id) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newHistory = [{ date: new Date().toISOString().split('T')[0], action: actionNote, user: 'Current User' }, ...(item.history || [])];
    
    try {
      await updateContentItem(workspace?.id, id, {
        status: newStatus,
        history: newHistory
      });
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

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
        updateItemStatus(draggableId, destination.droppableId, `Moved from ${source.droppableId} to ${destination.droppableId}`);
        toast.success(`Moved to ${destination.droppableId}`);
      }
    }
  };

  const moveCardChevron = (item: ContentItem, direction: 'left' | 'right') => {
    const currentStageIndex = stages.findIndex(s => s.id === item.status);
    if (direction === 'left' && currentStageIndex > 0) {
      const newStage = stages[currentStageIndex - 1];
      updateItemStatus(item.id, newStage.id, `Moved from ${item.status} to ${newStage.id}`);
      toast.success(`Moved to ${newStage.id}`);
    } else if (direction === 'right' && currentStageIndex < stages.length - 1) {
      const newStage = stages[currentStageIndex + 1];
      updateItemStatus(item.id, newStage.id, `Moved from ${item.status} to ${newStage.id}`);
      toast.success(`Moved to ${newStage.id}`);
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
      setFormPersona(item.persona);
      setFormDueDate(item.dueDate);
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormType('Blog');
      setFormCampaign('');
      setFormPriority('Medium');
      setFormStage('Ideas');
      setFormDescription('');
      setFormPersona(PERSONAS[0]);
      setFormDueDate('');
    }
    setIsCreateModalOpen(true);
  };

  const saveContentItem = async () => {
    if (!workspace?.id) return;
    if (!formTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      if (editingItem && editingItem.id) {
        const newHistory = [{ date: new Date().toISOString().split('T')[0], action: 'Updated details', user: 'Current User' }, ...(editingItem.history || [])];
        await updateContentItem(workspace?.id, editingItem.id, {
          title: formTitle,
          type: formType,
          campaign: formCampaign,
          priority: formPriority,
          status: formStage,
          description: formDescription,
          persona: formPersona,
          dueDate: formDueDate,
          lastEdited: new Date().toISOString().split('T')[0],
          history: newHistory
        });
        toast.success('Content updated');
      } else {
        const newItem = {
          title: formTitle,
          type: formType,
          campaign: formCampaign,
          priority: formPriority,
          status: formStage,
          description: formDescription,
          persona: formPersona,
          author: 'Current User',
          owner: 'Current User',
          lastEdited: new Date().toISOString().split('T')[0],
          dueDate: formDueDate,
          comments: [],
          history: [{ date: new Date().toISOString().split('T')[0], action: 'Created item', user: 'Current User' }]
        };
        await createContentItem(workspace?.id, newItem);
        toast.success('Content created');
      }
      setIsCreateModalOpen(false);
    } catch (e) {
      toast.error('Failed to save content');
    }
  };

  const deleteItem = async (id: string) => {
    if (!workspace?.id) return;
    try {
      await deleteContentItem(workspace?.id, id);
      toast.success('Content deleted');
      if (selectedItem?.id === id) setIsDetailDrawerOpen(false);
      if (editingItem?.id === id) setIsCreateModalOpen(false);
    } catch (e) {
      toast.error('Failed to delete content');
    }
  };

  const addComment = async () => {
    if (!workspace?.id || !commentText.trim() || !selectedItem || !selectedItem.id) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      avatar: 'C',
      text: commentText,
      date: new Date().toISOString().split('T')[0]
    };
    
    try {
      const newComments = [...(selectedItem.comments || []), newComment];
      const newHistory = [{ date: new Date().toISOString().split('T')[0], action: 'Added comment', user: 'Current User' }, ...(selectedItem.history || [])];
      
      await updateContentItem(workspace?.id, selectedItem.id, {
        comments: newComments,
        history: newHistory
      });
      
      setCommentText('');
    } catch (e) {
      toast.error('Failed to add comment');
    }
  };

  const approveAsset = (item: ContentItem) => {
    updateItemStatus(item.id, 'Approved', 'Asset Approved');
    toast.success('Asset Approved');
  };

  const sendBackAsset = (item: ContentItem) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for sending it back.');
      return;
    }
    updateItemStatus(item.id, 'Draft', `Sent back to Draft. Reason: ${rejectionReason}`);
    toast.success('Asset sent back to Draft');
    setIsRejecting(false);
    setRejectionReason('');
  };

  const clearLibraryFilters = () => {
    setLibSearch('');
    setLibType('all');
    setLibStage('all');
    setLibPersona('all');
  };

  const getBadgeStyle = (type: string) => {
    const found = CONTENT_TYPES.find(c => c.label === type);
    return found ? found.color : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      {/* 2. Global Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-violet-600 dark:text-violet-400 w-6 h-6" />
            Content Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage marketing assets, campaigns, and pipelines across your team.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          
          {/* Segmented Control Navigation */}
          <div className="flex p-1 bg-muted rounded-lg shadow-sm border overflow-hidden">
            <button 
              onClick={() => setActiveTab('pipeline')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'pipeline' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
            >
              Pipeline
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'library' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
            >
              Library
            </button>
            <button 
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
            >
              Approvals
              {inReviewCount > 0 && (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {inReviewCount}
                </span>
              )}
            </button>
          </div>

          <Button onClick={() => openCreateModal()} className="shadow-sm bg-primary text-primary-foreground">
            <Plus size={16} className="mr-2" />
            New Content
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 border-t pt-4">
        
        {/* 3. View 1: Pipeline (Kanban Board) */}
        {activeTab === 'pipeline' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search pipeline..." 
                  className="pl-9 h-9 bg-background" 
                  value={pipelineSearch}
                  onChange={(e) => setPipelineSearch(e.target.value)}
                />
              </div>
              <Select value={pipelineCampaign} onValueChange={setPipelineCampaign}>
                <SelectTrigger className="w-[200px] h-9 bg-background">
                  <SelectValue placeholder="Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {uniqueCampaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="board" type="stage" direction="horizontal">
                  {(provided) => (
                    <div 
                      className="flex gap-4 overflow-x-auto h-full pb-4 items-start"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {stages.map((stage, index) => {
                        const stageItems = pipelineItems.filter(i => i.status === stage.id);
                        
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
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                      <Pencil size={12} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500">
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                                
                                <Droppable droppableId={stage.id} type="card">
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors rounded-lg p-1 ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                                    >
                                      {stageItems.map((item, itemIndex) => (
                                        <Draggable key={item.id!} draggableId={item.id!} index={itemIndex}>
                                          {(provided, snapshot) => (
                                            <Card
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              onClick={() => { setSelectedItem(item); setIsDetailDrawerOpen(true); }}
                                              className={`cursor-pointer transition-all border shadow-sm hover:shadow-md bg-background/95 backdrop-blur-sm group/card relative
                                                ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 rotate-2 scale-[1.02] bg-background' : 'hover:border-primary/30'}
                                              `}
                                              style={{...provided.draggableProps.style}}
                                            >
                                              <CardContent className="p-3.5 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${getBadgeStyle(item.type)} border`}>
                                                    {item.type}
                                                  </Badge>
                                                  {item.priority === 'High' && (
                                                    <span className="flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-500/20" title="High Priority" />
                                                  )}
                                                </div>
                                                
                                                <div>
                                                  <h4 className="text-sm font-semibold leading-tight line-clamp-2">{item.title}</h4>
                                                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{item.campaign}</p>
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                    <Calendar size={11}/> {item.dueDate || 'No date'}
                                                  </p>
                                                  <div className="flex items-center gap-2">
                                                    
                                                    {/* Chevron Movers */}
                                                    <div className="hidden group-hover/card:flex items-center bg-muted rounded border shadow-sm">
                                                      <button 
                                                        className="p-1 hover:bg-background hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        onClick={(e) => { e.stopPropagation(); moveCardChevron(item, 'left'); }}
                                                        disabled={index === 0}
                                                      >
                                                        <ChevronLeft size={12} />
                                                      </button>
                                                      <div className="w-px h-3 bg-border"></div>
                                                      <button 
                                                        className="p-1 hover:bg-background hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        onClick={(e) => { e.stopPropagation(); moveCardChevron(item, 'right'); }}
                                                        disabled={index === stages.length - 1}
                                                      >
                                                        <ChevronRight size={12} />
                                                      </button>
                                                    </div>

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
                        <Button variant="outline" className="w-full h-[50px] border-dashed border-2 hover:bg-muted/50 bg-transparent text-muted-foreground transition-all group"
                          onClick={() => {
                            const newStageName = prompt("Enter new column name:");
                            if (newStageName && newStageName.trim()) {
                              const newStageId = newStageName.trim();
                              if (!stages.find(s => s.id === newStageId)) {
                                setStages([...stages, { id: newStageId, label: newStageId, dotColor: 'bg-slate-400', order: stages.length }]);
                              }
                            }
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                          Add Column
                        </Button>
                      </div>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        )}

        {/* 4. View 2: Library (Data Table) */}
        {activeTab === 'library' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search library..." 
                  className="pl-9 h-9 bg-background" 
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                />
              </div>
              <Select value={libType} onValueChange={setLibType}>
                <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Types</SelectItem>{CONTENT_TYPES.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={libStage} onValueChange={setLibStage}>
                <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="All Stages" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Stages</SelectItem>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={libPersona} onValueChange={setLibPersona}>
                <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="All Personas" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Personas</SelectItem>{PERSONAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={clearLibraryFilters} className="text-muted-foreground h-9 px-3 hover:text-foreground">
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>

            <div className="bg-card border rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left relative">
                  <thead className="bg-muted/50 text-muted-foreground border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Content</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Campaign / Strategy</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Owner & Date</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {libraryItems.map(item => {
                      const stageDef = stages.find(s => s.id === item.status);
                      return (
                        <tr key={item.id!} className="hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => { setSelectedItem(item); setIsDetailDrawerOpen(true); }}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{item.title}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5 opacity-70">ID: {item.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${getBadgeStyle(item.type)} border`}>
                              {item.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground text-sm leading-tight">{item.campaign}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.persona}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${stageDef?.dotColor || 'bg-gray-400'}`}></span>
                              <span className="font-medium text-xs">{item.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{item.owner.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                              <div>
                                <p className="text-xs font-medium">{item.owner}</p>
                                <p className="text-[10px] text-muted-foreground">{item.dueDate || 'No date'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openCreateModal(item)}>
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteItem(item.id!)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {libraryItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No content found in the library matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. View 3: Approvals (Review Workflow) */}
        {activeTab === 'approvals' && (
          <div className="flex-1 flex flex-col space-y-8 min-h-0 overflow-y-auto pb-8">
            


            {/* Pending Approvals List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold tracking-tight">Pending Approvals</h3>
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                  {approvalItems.length} items require review
                </Badge>
              </div>

              {approvalItems.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-xl border border-dashed text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-foreground">You&apos;re all caught up!</p>
                  <p className="text-sm">There are no assets currently waiting for review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {approvalItems.map(item => (
                    <Card key={item.id} className="flex flex-col shadow-sm border hover:shadow-md transition-shadow">
                      <CardContent className="p-5 flex-1 flex flex-col space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${getBadgeStyle(item.type)} border`}>{item.type}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> Due {item.dueDate || 'N/A'}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">{item.campaign}</p>
                          <h4 className="text-lg font-bold leading-tight cursor-pointer hover:text-primary transition-colors" onClick={() => { setSelectedItem(item); setIsDetailDrawerOpen(true); }}>
                            {item.title}
                          </h4>
                        </div>

                        <div className="bg-muted/30 p-3 rounded-lg text-sm text-foreground/80 leading-relaxed flex-1 italic relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-muted-foreground/20 before:rounded-l-lg">
                          &quot;{item.description || 'No description provided.'}&quot;
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{item.author.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                          <span className="text-xs font-medium">Submitted by {item.author}</span>
                        </div>
                      </CardContent>
                      <div className="border-t p-3 bg-muted/10 flex items-center justify-between gap-3">
                        <Button 
                          variant="ghost" 
                          className="flex-1 text-muted-foreground hover:text-foreground hover:bg-muted font-medium text-xs"
                          onClick={() => {
                            setSelectedItem(item);
                            setIsRejecting(true);
                          }}
                        >
                          <ArrowRight className="w-4 h-4 mr-1.5 rotate-180" /> Send back to Draft
                        </Button>
                        <Button 
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-sm"
                          onClick={() => approveAsset(item)}
                        >
                          Approve Asset <Check className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Shared UI Components - Detail Slide-out Drawer */}
      <Sheet open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-xl p-0 flex flex-col h-full bg-background/95 backdrop-blur-xl border-l">
          {selectedItem && (
            <>
              <SheetHeader className="p-6 border-b pb-4 bg-background z-10 sticky top-0 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 pr-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${getBadgeStyle(selectedItem.type)} border`}>
                        {selectedItem.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${stages.find(s => s.id === selectedItem.status)?.dotColor}`}></span>
                        {selectedItem.status}
                      </Badge>
                    </div>
                    <SheetTitle className="text-xl leading-tight">{selectedItem.title}</SheetTitle>
                  </div>
                  <button onClick={() => setIsDetailDrawerOpen(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="metadata" className="h-full flex flex-col">
                  <div className="px-6 border-b bg-background/50 sticky top-0 z-10 backdrop-blur-md">
                    <TabsList className="bg-transparent h-12 w-full justify-start space-x-6 p-0">
                      <TabsTrigger value="metadata" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full font-medium">Metadata</TabsTrigger>
                      <TabsTrigger value="comments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-1.5 font-medium">
                        Comments
                        {selectedItem.comments.length > 0 && (
                          <span className="bg-primary/10 text-primary text-[10px] py-0.5 px-1.5 rounded-full">{selectedItem.comments.length}</span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full font-medium">History</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="metadata" className="p-6 space-y-8 mt-0">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider text-xs">Description</h4>
                      <div className="text-sm text-foreground bg-muted/30 p-4 rounded-xl leading-relaxed whitespace-pre-wrap border border-transparent hover:border-border transition-colors">
                        {selectedItem.description || 'No description provided.'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1.5 border-l-2 pl-3 border-muted hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Campaign</span>
                        <p className="text-sm font-semibold text-foreground">{selectedItem.campaign}</p>
                      </div>
                      <div className="space-y-1.5 border-l-2 pl-3 border-muted hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Target Persona</span>
                        <p className="text-sm font-semibold text-foreground">{selectedItem.persona}</p>
                      </div>
                      <div className="space-y-1.5 border-l-2 pl-3 border-muted hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Workflow Status</span>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${stages.find(s => s.id === selectedItem.status)?.dotColor}`}></span>
                          {selectedItem.status}
                        </p>
                      </div>
                      <div className="space-y-1.5 border-l-2 pl-3 border-muted hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assigned Owner</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{selectedItem.owner.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <p className="text-sm font-semibold text-foreground">{selectedItem.owner}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 border-l-2 pl-3 border-muted hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Due Date</span>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Calendar size={14} className="text-muted-foreground" /> {selectedItem.dueDate || 'Not set'}</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="comments" className="p-6 flex flex-col h-[calc(100vh-220px)] mt-0 space-y-4">
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

                  <TabsContent value="history" className="p-6 mt-0">
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/60 before:via-border/60 before:to-transparent">
                      {selectedItem.history.map((h, i) => (
                        <div key={i} className="relative flex items-center justify-between group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background text-muted-foreground shrink-0 shadow-sm ring-4 ring-background z-10">
                            <Clock size={16} />
                          </div>
                          <div className="w-[calc(100%-3.5rem)] p-4 rounded-xl border bg-card shadow-sm space-y-1">
                            <div className="flex items-center justify-between mb-1">
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

              {/* Dynamic Footer Actions */}
              <div className="p-4 border-t bg-muted/10 flex items-center justify-between shrink-0">
                {selectedItem.status === 'In Review' ? (
                  <>
                    <Button 
                      variant="ghost" 
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 font-medium"
                      onClick={() => setIsRejecting(true)}
                    >
                      <ArrowRight className="w-4 h-4 mr-1.5 rotate-180" /> Send Back
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => { approveAsset(selectedItem); setIsDetailDrawerOpen(false); }}
                    >
                      Approve Asset <Check className="w-4 h-4 ml-1.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="text-muted-foreground hover:bg-muted font-medium" onClick={() => setIsDetailDrawerOpen(false)}>
                      Close
                    </Button>
                    <Button className="bg-primary text-primary-foreground shadow-sm" onClick={() => { setIsDetailDrawerOpen(false); openCreateModal(selectedItem); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit Item
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* 6. Shared UI Components - Create / Edit Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl">{editingItem ? 'Edit Content Item' : 'Create New Content'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modify the details of this content asset.' : 'Fill out the form below to add a new asset to your workspace.'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Content Title</Label>
              <Input id="title" placeholder="e.g. 10 Tips for SEO in 2026" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="bg-background focus-visible:ring-1" />
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign</Label>
                <Input value={formCampaign} onChange={(e) => setFormCampaign(e.target.value)} placeholder="e.g. Summer Launch" className="bg-background focus-visible:ring-1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Persona</Label>
                <Select value={formPersona} onValueChange={setFormPersona}>
                  <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERSONAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage</Label>
                <Select value={formStage} onValueChange={setFormStage}>
                  <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <Input type="date" id="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="bg-background focus-visible:ring-1" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description / Creative Brief</Label>
              <Textarea 
                id="desc" 
                placeholder="Briefly describe the requirements, angle, and specific deliverables..." 
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
                className="resize-none h-28 bg-background focus-visible:ring-1"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t bg-muted/10 flex justify-between items-center sm:justify-between">
            <div>
              {editingItem && (
                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteItem(editingItem.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button onClick={saveContentItem} className="shadow-sm">{editingItem ? 'Save Changes' : 'Create Content'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejecting} onOpenChange={setIsRejecting}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertCircle className="w-5 h-5"/> Send Back to Draft</DialogTitle>
            <DialogDescription>
              Please provide a reason or feedback for why this asset needs more work before approval.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="e.g. Please revise the second paragraph to align better with our brand voice..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="h-24 resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsRejecting(false); setRejectionReason(''); }}>Cancel</Button>
            <Button onClick={() => selectedItem && sendBackAsset(selectedItem)} className="bg-rose-600 hover:bg-rose-700 text-white">Send Back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
