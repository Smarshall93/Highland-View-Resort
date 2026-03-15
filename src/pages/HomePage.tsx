import React, { useEffect, useMemo, useState } from 'react';
import { format, isAfter, formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Clock, ClipboardList, Activity, QrCode, 
  Map as MapIcon, Calendar, ArrowRight, MessageSquare,
  ChevronRight
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { EmployeeDetailsSheet } from '@/components/EmployeeDetailsSheet';
import { cn } from '@/lib/utils';
export function HomePage() {
  const userId = useAuthStore(s => s.user?.id);
  const userRole = useAuthStore(s => s.user?.role);
  const userName = useAuthStore(s => s.user?.name);
  const userShiftRoles = useAuthStore(s => s.user?.shiftRoles);
  const timeEntries = useDataStore(s => s.timeEntries);
  const tasks = useDataStore(s => s.tasks);
  const users = useDataStore(s => s.users);
  const shifts = useDataStore(s => s.shifts);
  const messages = useDataStore(s => s.messages);
  const syncData = useDataStore(s => s.syncData);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
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
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
  // --- Derived Data ---
  const myRoleIds = useMemo(() => userShiftRoles?.map(r => r.id) || [], [userShiftRoles]);
  const upcomingShifts = useMemo(() => {
    return shifts
      .filter(s => s.userId === userId && isAfter(new Date(s.startTime), new Date()))
      .sort((a, b) => a.startTime - b.startTime);
  }, [shifts, userId]);
  const nextShift = upcomingShifts[0];
  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      const isMine = isManagerOrAdmin || t.assignees?.includes(userId || '') || t.assignedRoles?.some(r => myRoleIds.includes(r)) || (!t.assignees?.length && !t.assignedRoles?.length);
      return isMine && !t.isDailyTemplate;
    });
  }, [tasks, userId, isManagerOrAdmin, myRoleIds]);
  const openTasks = useMemo(() => todayTasks.filter(t => t.status !== 'completed').length, [todayTasks]);
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
      <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
        {/* HERO */}
        <div className="relative overflow-hidden bg-card border shadow-2xl rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 group">
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10 flex flex-col gap-3">
            <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/20 px-4 py-1 font-black uppercase tracking-widest text-[10px]">
              {isManagerOrAdmin ? 'Admin Control' : 'Team Member Dashboard'}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[0.9]">
              Hello, <span className="text-primary">{userName?.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-3 font-bold text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              {format(currentTime, 'EEEE, MMMM do')}
              <span className="text-border">•</span>
              <span className="font-mono text-primary">{format(currentTime, 'h:mm a')}</span>
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-4">
             {nextShift && (
               <Card className="bg-primary/5 border-primary/20 shadow-none px-6 py-4 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-black text-primary/60 tracking-widest mb-1">Your Next Shift</span>
                  <span className="text-lg font-black text-primary">{format(new Date(nextShift.startTime), 'EEE h:mm a')}</span>
               </Card>
             )}
             <Button onClick={() => navigate('/chat')} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white shadow-xl flex gap-3">
               <MessageSquare className="h-6 w-6" />
               <span className="font-bold">Team Chat</span>
               {messages.length > 0 && <Badge className="bg-emerald-500 text-white ml-2">{messages.length > 9 ? '9+' : messages.length}</Badge>}
             </Button>
          </div>
        </div>
        {/* METRICS */}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Pending Tasks', value: openTasks, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Team', value: activeEmployeesCount, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'QR Requests', value: tasks.filter(t => t.qrCodeId && t.status !== 'completed').length, icon: QrCode, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'System Health', value: '100%', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
               <CardContent className="p-6 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    <p className="text-4xl font-black tracking-tighter">{stat.value}</p>
                  </div>
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
                    <stat.icon className="h-7 w-7" />
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            {/* Quick Nav */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { to: '/tasks', icon: ClipboardList, label: 'Tasks', color: 'text-blue-500' },
                { to: '/schedule', icon: Calendar, label: 'Schedule', color: 'text-purple-500' },
                { to: '/time-clock', icon: Clock, label: 'Time Clock', color: 'text-emerald-500' },
                { to: '/map', icon: MapIcon, label: 'Map', color: 'text-amber-500' }
              ].map((link, i) => (
                <Button key={i} variant="outline" className="h-28 flex flex-col rounded-[2rem] border-2 hover:border-primary/50 transition-all group" asChild>
                   <Link to={link.to}>
                     <link.icon className={cn("h-8 w-8 mb-2 transition-transform group-hover:scale-110", link.color)} />
                     <span className="font-black text-xs uppercase tracking-widest">{link.label}</span>
                   </Link>
                </Button>
              ))}
            </div>
            {/* Chat Preview */}
            <Card className="rounded-[2.5rem] shadow-xl overflow-hidden border-none bg-slate-900 text-white">
               <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between p-8">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner">
                        <MessageSquare className="h-6 w-6" />
                     </div>
                     <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Team Briefing</CardTitle>
                        <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest mt-1">Latest Communication</CardDescription>
                     </div>
                  </div>
                  <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" asChild>
                    <Link to="/chat">Open Hub <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
               </CardHeader>
               <CardContent className="p-8 space-y-4">
                  {messages.slice(-3).map(m => {
                    const sender = users.find(u => u.id === m.userId);
                    return (
                      <div key={m.id} className="flex gap-4 items-start p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-black text-xs">
                           {sender?.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-primary">{sender?.name || 'System'}</span>
                              <span className="text-[10px] text-white/40">{formatDistanceToNow(m.ts, { addSuffix: true })}</span>
                           </div>
                           <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <p className="text-center py-8 text-white/40 font-bold italic uppercase tracking-widest text-xs">No active briefing items</p>}
               </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-4 space-y-8">
            <Card className="rounded-[2.5rem] shadow-xl border-none">
              <CardHeader className="p-8 border-b">
                <CardTitle className="flex items-center gap-3 text-xl font-black">
                  <Activity className="h-6 w-6 text-primary" /> Live Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="divide-y max-h-[500px] overflow-y-auto">
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
                             <p className="text-sm font-bold truncate">{u?.name || 'Employee'}</p>
                             <p className="text-xs text-muted-foreground mt-0.5">
                               {e.type.replace('_', ' ')} at <span className="font-bold text-foreground">{format(e.timestamp, 'h:mm a')}</span>
                             </p>
                          </div>
                       </div>
                     );
                   })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <EmployeeDetailsSheet userId={selectedUserId} isOpen={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </AppLayout>
  );
}