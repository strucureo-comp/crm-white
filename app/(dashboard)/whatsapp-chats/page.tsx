'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
  Search,
  Phone,
  MoreVertical,
  Image as ImageIcon,
  FileText,
  Mic,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps } from '@/lib/db/automation/api';
import { ref, onValue, push, set, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import Link from 'next/link';

interface WhatsAppMessage {
  id: string;
  platform: string;
  messageId: string;
  from: string;
  to: string;
  body: string;
  type: string;
  company_id: string;
  direction: 'incoming' | 'outgoing';
  status?: string;
  timestamp: string;
}

interface Conversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  messages: WhatsAppMessage[];
}

export default function WhatsAppChatsPage() {
  const { workspace, user } = useAuth();
  const companyId = user?.company_id || '';
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if WhatsApp is connected
  useEffect(() => {
    if (!workspace?.id) return;
    const check = async () => {
      try {
        const apps = await getConnectedApps(workspace.id);
        setConnected(apps.some((a) => a.platform === 'whatsapp' && a.status === 'connected'));
      } catch (e) {
        console.error('Failed to check connection:', e);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [workspace?.id]);

  // Subscribe to WhatsApp messages
  useEffect(() => {
    if (!companyId || !connected) return;

    const messagesRef = ref(database, 'whatsapp_messages');
    const companyQuery = query(messagesRef, orderByChild('company_id'), equalTo(companyId));

    const unsubscribe = onValue(companyQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setConversations([]);
        return;
      }

      const data = snapshot.val();
      const msgs: WhatsAppMessage[] = [];
      for (const [key, val] of Object.entries(data)) {
        msgs.push({ id: key, ...(val as any) });
      }

      // Group by phone number (from for incoming, to for outgoing)
      const convMap = new Map<string, Conversation>();
      for (const msg of msgs) {
        const phone = msg.direction === 'incoming' ? msg.from : msg.to;
        if (!phone) continue;

        if (!convMap.has(phone)) {
          convMap.set(phone, {
            phone,
            name: phone,
            lastMessage: '',
            lastTimestamp: '',
            unreadCount: 0,
            messages: [],
          });
        }
        const conv = convMap.get(phone)!;
        conv.messages.push(msg);
      }

      // Sort messages and get last message for each conversation
      const convArray = Array.from(convMap.values()).map((conv) => {
        conv.messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const last = conv.messages[conv.messages.length - 1];
        conv.lastMessage = last.body || `[${last.type}]`;
        conv.lastTimestamp = last.timestamp;
        return conv;
      });

      // Sort conversations by last message time
      convArray.sort(
        (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
      );

      setConversations(convArray);
    });

    return () => unsubscribe();
  }, [companyId, connected]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedPhone, conversations]);

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPhone || !companyId) return;
    setSending(true);
    try {
      const res = await fetch('/api/connectors/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedPhone, message: newMessage.trim(), company_id: companyId }),
      });
      if (res.ok) {
        setNewMessage('');
      }
    } catch (e) {
      console.error('Failed to send:', e);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.phone.includes(searchQuery) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/integrations">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp Chats</h1>
            <p className="text-muted-foreground">Connect WhatsApp to view chats</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">WhatsApp Not Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your WhatsApp Business account to view and manage chats here.
            </p>
            <Link href="/integrations/whatsapp">
              <Button>
                <MessageSquare size={16} className="mr-2" />
                Connect WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/integrations">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">WhatsApp Chats</h1>
              <p className="text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <MessageSquare size={12} className="mr-1" />
          Connected
        </Badge>
      </div>

      {/* Chat Layout */}
      <div className="flex h-[calc(100vh-220px)] border rounded-lg overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 border-r bg-background flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.phone}
                  onClick={() => setSelectedPhone(conv.phone)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors border-b ${
                    selectedPhone === conv.phone ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {conv.phone.slice(-2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{conv.phone}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(conv.lastTimestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {selectedPhone?.slice(-2)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedPhone}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.messages.length} message{selectedConversation.messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button variant="ghost" size="icon">
                  <Phone size={16} />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical size={16} />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.messages.map((msg) => {
                  const isOutgoing = msg.direction === 'outgoing';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 ${
                          isOutgoing
                            ? 'bg-green-600 text-white'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.type === 'image' || msg.type === 'video' || msg.type === 'document' ? (
                          <div className="flex items-center gap-2">
                            {msg.type === 'image' ? (
                              <ImageIcon size={14} />
                            ) : msg.type === 'document' ? (
                              <FileText size={14} />
                            ) : (
                              <Mic size={14} />
                            )}
                            <span className="text-sm">{msg.body || `[${msg.type}]`}</span>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        )}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 ${
                            isOutgoing ? 'text-green-100' : 'text-muted-foreground'
                          }`}
                        >
                          <span className="text-[10px]">
                            {formatTime(msg.timestamp)}
                          </span>
                          {isOutgoing && msg.status && (
                            <span className="text-[10px]">
                              {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a chat from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
