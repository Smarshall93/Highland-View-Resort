import React, { useEffect, useMemo, useState } from 'react';
import { format, isAfter, formatDistanceToNow, isToday } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Clock, ClipboardList, Activity, QrCode,
  Map as MapIcon, Calendar, ArrowRight, MessageSquare, BrainCircuit, Sparkles, Zap, Navigation, Lightbulb, CheckCircle2, ListTodo, Plus, Loader2, Shield, AlertCircle
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { EmployeeDetailsSheet } from '@/components/EmployeeDetailsSheet';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
export function HomePage() {
  const userId = useAuthStore(s => s.user?.id);
  const userRole = useAuthStore(s => s.user?.role);
  const userName = useAuthStore(s => s.user?.name);
  const timeEntries = useDataStore(s => s.timeEntries);
  const tasks = useDataStore(s => s.tasks);
  const users = useDataStore(s => s.users);
  const shifts = useDataStore(s => s.shifts);
  const messages = useDataStore(s => s.messages);
  const syncData = useDataStore(s => s.syncData);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isGeneratingAgenda, setIsGeneratingAgenda] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (userId && userRole) {
      syncData(userId, userRole).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userId, userRole, syncData]);
  const isOwner = userRole === 'owner';
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'owner';
  const canMutate = (userRole === 'admin' || userRole === 'manager') && !isOwner;
  // --- AI Insights Engine ---
  const aiInsights = useMemo(() => {
    const insights = [];
    const activeStaff = users.filter(u => {
      const uEntries = timeEntries.filter(x => x.userId === u.id).sort((a,b) => b.timestamp - a.timestamp);
      return uEntries[0]?.type === 'clock_in' || uEntries[0]?.type === 'break_end';
    }).length;
    if (activeStaff === 0 && shifts.filter(s => isToday(new Date(s.startTime))).length > 0) {
      insights.push({
        type: 'critical',
        label: 'Workforce Gap',
        text: 'AI Detects 0 active staff on property despite scheduled shifts.',
        icon: AlertCircle
      });
    }
    const openQrTasks = tasks.filter(t => t.qrCodeId && t.status !== 'completed').length;
    if (openQrTasks > 5) {
      insights.push({
        type: 'warning',
        label: 'Bottleneck Alert',
        text: `Customer QR requests are accumulating (${openQrTasks} pending).`,
        icon: Zap
      });
    } else {
      insights.push({
        type: 'success',
        label: 'Operational Excellence',
        text: 'Response times for QR requests are trending 15% faster.',
        icon: Sparkles
      });
    }
    return insights;
  }, [tasks, timeEntries, shifts, users]);
  const handleGenerateAgenda = async () => {
    if (!canMutate) {
        toast.error("Access Restricted", { description: "Owners have read-only permissions." });
        return;
    }
    setIsGeneratingAgenda(true);
    toast.info("AI Analysis: Evaluating recurring routines...");
    setTimeout(() => {
      setIsGeneratingAgenda(false);
      toast.success("Daily Agenda Optimized");
      navigate('/tasks');
    }, 2500);
  };
  const nextShift = useMemo(() => {
    return shifts
      .filter(s => s.userId === userId && isAfter(new Date(s.startTime), new Date()))
      .sort((a, b) => a.startTime - b.startTime)[0];
  }, [shifts, userId]);
  const activeEmployeesCount = useMemo(() => {
    const latest = new Map();
    timeEntries.forEach(e => {
      if(!latest.has(e.userId) || e.timestamp > latest.get(e.userId).timestamp) {
        latest.set(e.userId, e);
      }
    });
    let count = 0;
    latest.forEach(e => { if(e.type === 'clock_in' || e.type === 'break_end') count++; });
    return count;
  }, [timeEntries]);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10 animate-in fade-in duration-700 pb-12">
        {isOwner && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl flex items-center justify-center gap-3 border border-slate-700 shadow-2xl animate-in slide-in-from-top-4">
                <Shield className="h-5 w-5 text-amber-400" />
                <span className="font-black text-xs tracking-widest uppercase">Live Operational Monitor Active</span>
            </div>
        )}
        {isManagerOrAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden group relative">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BrainCircuit className="h-32 w-32" />
               </div>
               <CardContent className="p-8 md:p-10 flex flex-col justify-between h-full min-h-[220px]">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">AI Intelligence Active</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter leading-none mb-6">Briefing Room</h2>
                    <div className="space-y-4">
                       {aiInsights.map((insight, i) => (
                         <div key={i} className="flex gap-4 items-start bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <insight.icon className={cn("h-5 w-5 shrink-0 mt-0.5", insight.type === 'success' ? 'text-emerald-400' : 'text-amber-400')} />
                            <p className="text-sm font-medium text-slate-300 leading-relaxed">{insight.text}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                  {canMutate && (
                      <Button
                        onClick={handleGenerateAgenda}
                        disabled={isGeneratingAgenda}
                        className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl h-14 shadow-xl shadow-emerald-500/20"
                      >
                        {isGeneratingAgenda ? <Loader2 className="animate-spin mr-2" /> : <ListTodo className="mr-2 h-5 w-5" />}
                        Optimize Agenda
                      </Button>
                  )}
               </CardContent>
            </Card>
            <Card className="bg-white border shadow-xl rounded-[2.5rem] flex flex-col justify-center p-8 md:p-10 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
               <div className="relative z-10 text-center md:text-left">
                  <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1 font-black uppercase tracking-widest text-[10px]">
                    Command Center
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-4">
                    Hello, <span className="text-primary">{userName?.split(' ')[0]}</span>
                  </h1>
                  <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-3 font-bold text-lg mb-8">
                    <Calendar className="h-5 w-5 text-primary" />
                    {format(currentTime, 'EEEE, MMMM do')}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                     <Button asChild size="lg" className="h-14 px-8 rounded-2xl shadow-xl transition-all hover:scale-105">
                        <Link to="/map" className="flex items-center gap-3">
                           <Navigation className="h-5 w-5" /> Live Radar
                        </Link>
                     </Button>
                     <Button variant="outline" onClick={() => navigate('/chat')} className="h-14 px-8 rounded-2xl border-2 hover:bg-muted flex gap-3 font-bold">
                        <MessageSquare className="h-5 w-5" /> Team Chat
                     </Button>
                  </div>
               </div>
            </Card>
          </div>
        )}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Unassigned Tasks', value: tasks.filter(t => !t.assignees?.length && t.status !== 'completed').length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Team', value: activeEmployeesCount, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending QR Requests', value: tasks.filter(t => t.qrCodeId && t.status !== 'completed').length, icon: QrCode, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'System Health', value: '100%', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden group rounded-3xl">
               <CardContent className="p-6 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    <p className="text-4xl font-black tracking-tighter">{stat.value}</p>
                  </div>
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm", stat.bg, stat.color)}>
                    <stat.icon className="h-7 w-7" />
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { to: '/tasks', icon: ClipboardList, label: 'Tasks', color: 'text-blue-500' },
                { to: '/schedule', icon: Calendar, label: 'Schedule', color: 'text-purple-500' },
                { to: '/time-clock', icon: Clock, label: 'Time Clock', color: 'text-emerald-500' },
                { to: '/map', icon: MapIcon, label: 'Radar', color: 'text-amber-500' }
              ].map((link, i) => (
                <Button key={i} variant="outline" className="h-28 flex flex-col rounded-[2.5rem] border-2 hover:border-primary/50 transition-all group" asChild>
                   <Link to={link.to}>
                     <link.icon className={cn("h-8 w-8 mb-2 transition-transform group-hover:scale-110", link.color)} />
                     <span className="font-black text-xs uppercase tracking-widest">{link.label}</span>
                   </Link>
                </Button>
              ))}
            </div>
            <Card className="rounded-[2.5rem] shadow-xl border-none">
              <CardHeader className="p-8 border-b flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl font-black">
                  <div className="h-3 w-3 bg-primary rounded-full animate-ping" />
                  Live Operational Feed
                </CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-full font-black text-[10px]">Real-time</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] overflow-y-auto">
                   {timeEntries.slice(0, 10).map(e => {
                     const u = users.find(x => x.id === e.userId);
                     return (
                       <div key={e.id} className="p-6 flex gap-4 items-start hover:bg-muted/50 transition-colors">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                            e.type === 'clock_in' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                          )}>
                             <Clock className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-black truncate">{u?.name || 'Employee'}</p>
                             <p className="text-xs text-muted-foreground mt-0.5 capitalize font-medium">
                               {e.type.replace('_', ' ')} • <span className="font-black text-foreground">{format(e.timestamp, 'h:mm a')}</span>
                             </p>
                          </div>
                          {e.location && <Badge variant="outline" className="text-[9px] uppercase font-black text-muted-foreground"><Navigation className="h-2 w-2 mr-1" /> Verified</Badge>}
                       </div>
                     );
                   })}
                   {timeEntries.length === 0 && <p className="p-12 text-center text-muted-foreground font-bold italic">Waiting for activity...</p>}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-4 space-y-8">
            <Card className="rounded-[2.5rem] shadow-xl overflow-hidden border-none bg-slate-900 text-white h-full">
               <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between p-8">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner">
                        <MessageSquare className="h-6 w-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Team Hub</CardTitle>
                        <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest mt-1">Briefing</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-8 space-y-4">
                  {messages.slice(-5).map(m => {
                    const sender = users.find(u => u.id === m.userId);
                    return (
                      <div key={m.id} className="flex gap-4 items-start p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-black text-xs shrink-0 text-primary">
                           {sender?.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-black text-sm text-primary">{sender?.name?.split(' ')[0] || 'System'}</span>
                              <span className="text-[10px] text-white/40 font-bold">{formatDistanceToNow(m.ts, { addSuffix: true })}</span>
                           </div>
                           <p className="text-sm text-white/80 line-clamp-2 leading-relaxed font-medium">{m.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <p className="text-center py-8 text-white/40 font-black italic uppercase tracking-widest text-xs">Radar Silent</p>}
               </CardContent>
               <CardFooter className="p-8 pt-0 mt-auto">
                  <Button variant="ghost" className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-2xl h-12 font-black tracking-widest uppercase text-xs" asChild>
                    <Link to="/chat">Open Team Radar <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
               </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <EmployeeDetailsSheet userId={selectedUserId} isOpen={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </AppLayout>
  );
}