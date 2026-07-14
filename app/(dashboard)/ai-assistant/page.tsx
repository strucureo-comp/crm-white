'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Sparkles, Lightbulb, BarChart3, Users, DollarSign, FileText, MessageSquare, Clock, Star, Loader2, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AiConversationDialog } from '@/components/dialogs/ai-conversation-dialog';
import { getAiConversations, createAiConversation, updateAiConversation, deleteAiConversation } from '@/lib/firebase/database';
import type { AiConversation, AiMessage } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';



const suggestions = [
  { icon: BarChart3, text: 'Show me this month\'s revenue trends' },
  { icon: Users, text: 'Which leads need follow-up today?' },
  { icon: DollarSign, text: 'What\'s the pipeline value this quarter?' },
  { icon: FileText, text: 'Create a summary of my top deals' },
];

const quickActions = [
  { label: 'Draft Email', icon: MessageSquare },
  { label: 'Summarize Deal', icon: DollarSign },
  { label: 'Generate Report', icon: BarChart3 },
  { label: 'Create Task', icon: FileText },
];

export default function AiAssistantPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });
  const historyRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAiConversations();
    setConversations(data);
    if (data.length > 0) {
      setActiveId(data[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    if (!message.trim() || sending) return;
    let conv = activeConversation;

    if (!conv) {
      const id = await createAiConversation({
        title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
        assistant: 'tara',
        messages: [],
        created_by: '',
      });
      if (!id) return;
      conv = { id, title: message.slice(0, 40), assistant: 'tara', messages: [], created_by: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setConversations((prev) => [conv!, ...prev]);
      setActiveId(id);
    }

    setSending(true);
    const userMsg: AiMessage = { role: 'user', message, timestamp: new Date().toISOString() };
    const updatedMessages = [...(conv.messages || []), userMsg];
    await updateAiConversation(conv.id, { messages: updatedMessages });
    setMessage('');

    let aiMessage = 'No response available.';
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant: conv.assistant }),
      });
      if (res.ok) {
        const data = await res.json();
        aiMessage = data.message;
      }
    } catch {
      aiMessage = 'Sorry, I encountered an error. Please try again.';
    }

    const aiMsg: AiMessage = { role: 'assistant', message: aiMessage, timestamp: new Date().toISOString() };
    const finalMessages = [...updatedMessages, aiMsg];
    await updateAiConversation(conv.id, { messages: finalMessages, title: conv.messages.length === 0 ? userMsg.message.slice(0, 40) : conv.title });
    setSending(false);
    load();
  }

  async function handleNewChat() {
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteAiConversation(id);
      if (activeId === id) setActiveId(null);
      load();
    } catch {
      toast.error('Failed to delete conversation');
    } finally {
      setConfirmState({ open: false });
    }
  }

  function handleSelectConversation(id: string) {
    setActiveId(id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assistantLabel = activeConversation?.assistant === 'rio' ? 'Rio' : 'Tara';
  const assistantColor = activeConversation?.assistant === 'rio' ? 'bg-violet-600' : 'bg-primary';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">Ask Tara or Rio anything about your business</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="tara" value={activeConversation?.assistant || 'tara'} onValueChange={async (v) => { if (activeConversation) { await updateAiConversation(activeConversation.id, { assistant: v }); load(); } }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tara">Tara - Sales</SelectItem>
              <SelectItem value="rio">Rio - Analytics</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => {
            historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>
            <Clock size={16} />
          </Button>
          <Button onClick={handleNewChat} size="sm">
            <Star size={14} className="mr-1" />New Chat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-[400px] sm:h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${assistantColor} flex items-center justify-center`}>
                    <Bot size={16} className="text-white" />
                  </div>
                  <span className="font-medium">{assistantLabel}</span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600">Online</Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleNewChat}><Star size={14} className="mr-1" />New Chat</Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Start a conversation with {assistantLabel}</p>
                </div>
              ) : (
                activeConversation.messages.map((chat, i) => (
                  <div key={i} className={`flex gap-3 ${chat.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {chat.role === 'assistant' ? (
                      <div className={`w-8 h-8 rounded-lg ${assistantColor} flex items-center justify-center shrink-0`}>
                        <Bot size={16} className="text-white" />
                      </div>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">U</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[80%] ${chat.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' : 'bg-muted rounded-2xl rounded-tl-sm'} p-3`}>
                      <p className="text-sm whitespace-pre-line">{chat.message}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder={`Ask ${assistantLabel} anything...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button size="icon" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="flex items-center gap-2 w-full p-2.5 rounded-lg text-sm text-left hover:bg-muted transition-colors"
                  onClick={() => setMessage(suggestion.text)}
                >
                  <suggestion.icon size={16} className="text-primary shrink-0" />
                  <span className="text-muted-foreground">{suggestion.text}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => {
                const actionPrompts: Record<string, string> = {
                  'Draft Email': 'Draft a professional email to a prospective client about our services',
                  'Summarize Deal': 'Summarize the details of our top current deal',
                  'Generate Report': 'Generate a weekly sales performance report',
                  'Create Task': 'Create a follow-up task for the top priority lead',
                };
                return (
                  <Button key={action.label} variant="outline" className="w-full justify-start text-sm h-9" onClick={() => { setMessage(actionPrompts[action.label] || action.label); }}>
                    <action.icon size={16} className="mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card ref={historyRef}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Recent Chats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No conversations yet</p>
              ) : (
                conversations.slice(0, 5).map((conv) => (
                  <div key={conv.id} className="flex items-center gap-1">
                    <button
                      className={`flex items-center gap-2 flex-1 p-2 rounded-lg text-sm hover:bg-muted transition-colors ${activeId === conv.id ? 'bg-muted' : ''}`}
                      onClick={() => handleSelectConversation(conv.id)}
                    >
                      <MessageSquare size={14} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </button>
                    <button className="text-muted-foreground hover:text-red-500 p-1" onClick={() => handleDelete(conv.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AiConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
