import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, User, MessageSquare, Clock, Info, CheckCircle2, Navigation, Megaphone, Trash2, Loader2, Sparkles } from 'lucide-react';
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
import { toast } from '@/lib/toast';
export function ChatPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const users = useDataStore(s => s.users);
  const messages = useDataStore(s => s.messages);
  const syncData = useDataStore(s => s.syncData);
  const addMessageLocal = useDataStore(s => s.addMessageLocal);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const isOwner = currentUserRole === 'owner';
  useEffect(() => {
    if (currentUserId && currentUserRole) syncData(currentUserId, currentUserRole);
  }, [currentUserId, currentUserRole, syncData]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const latestAnnouncement = useMemo(() => {
    return [...messages]
      .reverse()
      .find(m => m.system && m.text.includes('📢'));
  }, [messages]);
  const handleSendMessage = async (e: React.FormEvent, announcement = false) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUserId || isSending) return;
    if (isOwner) {
      toast.error("Monitor Mode", { description: "Owners have read-only access to Team Hub." });
      return;
    }
    setIsSending(true);
    const text = inputText.trim();
    setInputText('');
    try {
      const msg = await api<ChatMessage>('/api/chats/messages', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: currentUserId, 
          text, 
          announcement 
        })
      });
      addMessageLocal(msg);
      toast.success(announcement ? "Announcement Published" : "Message Sent");
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error("Failed to sync message");
    } finally {
      setIsSending(false);
    }
  };
  const handleClearHistory = async () => {
    if (!window.confirm("Admin Action: Clear all team chat history? This cannot be undone.")) return;
    setIsClearing(true);
    try {
      await api('/api/chats/history', { method: 'DELETE' });
      if (currentUserId && currentUserRole) syncData(currentUserId, currentUserRole, true);
      toast.success("Team Hub cleared");
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setIsClearing(false);
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
              <h1 className="text-xl font-bold tracking-tight">Team Hub</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                Operations Briefing Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex bg-background shadow-sm">
              {users.length} Online
            </Badge>
            {isManagerOrAdmin && !isOwner && (
              <Button variant="ghost" size="icon" onClick={handleClearHistory} disabled={isClearing} className="text-muted-foreground hover:text-destructive">
                {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </header>
        {latestAnnouncement && (
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-500">
             <div className="flex items-center gap-3 min-w-0">
               <Megaphone className="h-5 w-5 text-primary shrink-0 animate-bounce" />
               <p className="text-sm font-black text-primary truncate leading-none">
                 {latestAnnouncement.text.replace('📢 ANNOUNCEMENT: ', '')}
               </p>
             </div>
             <span className="text-[10px] font-bold text-primary/60 shrink-0 uppercase ml-4">Current Notice</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full" ref={scrollRef}>
          {messages.length > 0 ? messages.map((msg, idx) => {
            const sender = users.find(u => u.id === msg.userId);
            const isMe = msg.userId === currentUserId;
            const isAnnouncement = msg.text.includes('📢');
            const isSystem = msg.system || isAnnouncement;
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center animate-in fade-in zoom-in-95 duration-300">
                  <div className={cn(
                    "border rounded-full px-6 py-2 flex items-center gap-3 shadow-sm",
                    isAnnouncement ? "bg-primary/10 border-primary/20" : "bg-muted/50 border-border"
                  )}>
                    {isAnnouncement ? <Megaphone className="h-4 w-4 text-primary" /> : <Info className="h-4 w-4 text-blue-500" />}
                    <span className={cn("text-xs font-bold tracking-tight", isAnnouncement ? "text-primary" : "text-muted-foreground")}>
                      {msg.text}
                    </span>
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
                      {sender?.avatarUrl ? <img src={sender.avatarUrl} className="h-full w-full object-cover"/> : <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500"><User className="h-5 w-5"/></div>}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className={cn("flex items-center gap-2", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && <span className="text-xs font-black text-foreground/80 tracking-tight">{sender?.name || 'Unknown'}</span>}
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        {format(new Date(msg.ts), 'h:mm a')}
                      </span>
                    </div>
                    <div className={cn(
                      "px-5 py-3 rounded-[2rem] shadow-sm text-sm leading-relaxed font-medium",
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
               <p className="font-bold text-lg">No briefing items</p>
               <p className="text-xs mt-1">Share an update with the team radar.</p>
            </div>
          )}
        </main>
        <footer className="p-4 sm:p-6 bg-background border-t shadow-[0_-4px_12px_rgba(0,0,0,0.02)] z-10">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            {isOwner && (
                <div className="bg-slate-100 p-2 rounded-xl text-center text-[10px] font-black uppercase text-slate-500 border border-dashed border-slate-300">
                   You are in read-only monitor mode
                </div>
            )}
            <form onSubmit={(e) => handleSendMessage(e, false)} className="flex items-center gap-3">
              <div className="relative flex-1">
                 <Input
                   placeholder="Type a team update..."
                   className="h-14 px-6 rounded-2xl bg-muted/40 border-none focus-visible:ring-primary shadow-inner text-base font-medium"
                   value={inputText}
                   onChange={e => setInputText(e.target.value)}
                   disabled={isOwner}
                 />
                 {isManagerOrAdmin && inputText.trim() && !isOwner && (
                    <Button 
                      type="button" 
                      onClick={(e) => handleSendMessage(e as any, true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-[10px] uppercase gap-1.5"
                    >
                      <Sparkles className="h-3 w-3" /> BroadCast
                    </Button>
                 )}
              </div>
              <Button
                type="submit"
                size="icon"
                className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg active:scale-95 transition-all shrink-0"
                disabled={!inputText.trim() || isSending || isOwner}
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-6 w-6" />}
              </Button>
            </form>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}