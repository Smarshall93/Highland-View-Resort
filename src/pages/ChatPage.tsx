import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, Clock, Info, CheckCircle2, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { api } from '@/lib/api-client';
import type { ChatMessage } from '@shared/types';
import { cn } from '@/lib/utils';
export function ChatPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const users = useDataStore(s => s.users);
  const messages = useDataStore(s => s.messages);
  const syncData = useDataStore(s => s.syncData);
  const addMessageLocal = useDataStore(s => s.addMessageLocal);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const role = useAuthStore.getState().user?.role;
    if (currentUserId && role) syncData(currentUserId, role);
  }, [currentUserId, syncData]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUserId || isSending) return;
    setIsSending(true);
    const text = inputText.trim();
    setInputText('');
    try {
      const msg = await api<ChatMessage>('/api/chats/messages', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId, text })
      });
      addMessageLocal(msg);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };
  return (
    <AppLayout container={false}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-muted/10">
        <header className="px-6 py-4 border-b bg-background shadow-sm flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Team Operations Chat</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                Live Connection Active
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex bg-background shadow-sm">
            {users.length} team members online
          </Badge>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6" ref={scrollRef}>
          {messages.length > 0 ? messages.map((msg, idx) => {
            const sender = users.find(u => u.id === msg.userId);
            const isMe = msg.userId === currentUserId;
            const isSystem = msg.system;
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-muted/50 border rounded-full px-6 py-2 flex items-center gap-3 shadow-sm">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-muted-foreground tracking-tight">{msg.text}</span>
                    <span className="text-[10px] text-slate-400">{format(new Date(msg.ts), 'HH:mm')}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className={cn("flex w-full group animate-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("flex gap-3 max-w-[85%] sm:max-w-[70%]", isMe ? "flex-row-reverse" : "flex-row")}>
                  {!isMe && (
                    <div className="h-10 w-10 rounded-full bg-secondary shrink-0 overflow-hidden border-2 border-background shadow-sm mt-1">
                      {sender?.avatarUrl ? <img src={sender.avatarUrl} className="h-full w-full object-cover"/> : <User className="h-5 w-5 m-auto text-muted-foreground mt-2"/>}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className={cn("flex items-center gap-2", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && <span className="text-xs font-bold text-foreground/80">{sender?.name || 'Unknown'}</span>}
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {format(new Date(msg.ts), 'h:mm a')}
                      </span>
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-3xl shadow-sm text-sm leading-relaxed",
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-background border border-border/50 text-foreground rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
               <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
               <p className="font-medium">No messages yet.</p>
               <p className="text-xs mt-1">Share an update with the team.</p>
            </div>
          )}
        </main>
        <footer className="p-4 sm:p-6 bg-background border-t shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="relative flex-1">
               <Input 
                 placeholder="Type a message to the team..." 
                 className="h-14 px-6 rounded-2xl bg-muted/40 border-none focus-visible:ring-primary shadow-inner text-base"
                 value={inputText}
                 onChange={e => setInputText(e.target.value)}
               />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg active:scale-95 transition-all"
              disabled={!inputText.trim() || isSending}
            >
              <Send className="h-6 w-6" />
            </Button>
          </form>
        </footer>
      </div>
    </AppLayout>
  );
}