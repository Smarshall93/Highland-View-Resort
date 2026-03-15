import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  CheckSquare, Plus, Clock, CheckCircle2, Circle,
  Calendar, Loader2, QrCode, Repeat, Sparkles, TrendingUp, BrainCircuit, Edit3
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Task, TaskStatus, Location } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { cn } from '@/lib/utils';
import { EditTaskModal } from '@/components/EditTaskModal';
const fetchLocation = async (): Promise<Location | undefined> => {
  if (!('geolocation' in navigator)) return undefined;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
};
export function TasksPage() {
  // Primitives
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const tasks = useDataStore(s => s.tasks);
  const users = useDataStore(s => s.users);
  const updateTaskLocal = useDataStore(s => s.updateTaskLocal);
  const syncData = useDataStore(s => s.syncData);
  const [filter, setFilter] = useState<TaskStatus | 'all' | 'templates' | 'performance'>('all');
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false); // State for new task button loading
  const isOwner = currentUserRole === 'owner';
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const performanceMetrics = useMemo(() => {
    const metrics: any[] = [];
    const qrTasks = tasks.filter(t => t.qrCodeId && t.status === 'completed' && t.completedAt);
    users.forEach(u => {
      const uTasks = qrTasks.filter(t => t.assignees?.includes(u.id));
      if (uTasks.length === 0) return;
      const avgRespTime = uTasks.reduce((acc, t) => {
        const resp = (t.completedAt || 0) - t.createdAt;
        return acc + resp;
      }, 0) / uTasks.length;
      metrics.push({
        id: u.id,
        name: u.name,
        role: u.role,
        completed: uTasks.length,
        avgResponseMs: avgRespTime
      });
    });
    return metrics.sort((a,b) => a.avgResponseMs - b.avgResponseMs);
  }, [tasks, users]);
  useEffect(() => {
    if (currentUserId && currentUserRole) {
      syncData(currentUserId, currentUserRole);
    }
  }, [currentUserId, currentUserRole, syncData]);

  const handleCreateNewTask = async () => {
    if (isOwner) {
        toast.error("Read-Only Access", { description: "Owners cannot create tasks." });
        return;
    }
    setIsCreatingNewTask(true);
    try {
      const newTask = {
        title: "New Operational Duty",
        description: `A new task initiated by ${currentUserRole}.`,
        status: 'pending' as TaskStatus,
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: currentUserId,
        assignees: currentUserId ? [currentUserId] : [],
        isDailyTemplate: false,
        isAiVerified: false,
      };

      await api<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ ...newTask, userRole: currentUserRole }), // Include userRole as requested
      });

      toast.success('New task created successfully!');
      syncData(currentUserId, currentUserRole, true); // Refresh data
    } catch (error) {
      console.error('Error creating new task:', error);
      toast.error('Failed to create new task', { description: (error as Error).message || 'An unknown error occurred.' });
    } finally {
      setIsCreatingNewTask(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: TaskStatus) => {
    if (isOwner) {
        toast.error("Read-Only Access", { description: "Owners cannot modify tasks." });
        return;
    }
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      setIsProcessingAction(id);
      const updates: Partial<Task> = { status: newStatus };
      if (newStatus === 'in_progress') {
         updates.lastStartedAt = Date.now();
         const loc = await fetchLocation();
         if (loc) updates.claimLocation = loc;
      } else if (newStatus === 'completed') {
         if (task.status === 'in_progress' && task.lastStartedAt) {
           const elapsed = Date.now() - task.lastStartedAt;
           updates.timeSpentMs = (task.timeSpentMs || 0) + elapsed;
         }
         updates.lastStartedAt = null;
         updates.completedAt = Date.now();
         const loc = await fetchLocation();
         if (loc) updates.completionLocation = loc;
      }
      updateTaskLocal(id, updates);
      await api<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      syncData(currentUserId, currentUserRole, true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update task');
    } finally {
      setIsProcessingAction(null);
    }
  };
  const handleToggleChecklistItem = async (taskId: string, itemId: string, completed: boolean) => {
    if (isOwner) {
        toast.error("Read-Only Access", { description: "Owners cannot toggle checklist items." });
        return;
    }
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.checklist) return;
      const updatedChecklist = task.checklist.map(item =>
        item.id === itemId ? { ...item, completed } : item
      );
      updateTaskLocal(taskId, { checklist: updatedChecklist });
      await api<Task>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checklist: updatedChecklist })
      });
    } catch (err) {
      toast.error('Failed to sync checklist');
    }
  };
  const filteredTasks = useMemo(() => {
    if (filter === 'performance') return [];
    return tasks.filter(t => {
      if (filter === 'templates') return t.isDailyTemplate === true;
      if (t.isDailyTemplate) return false;
      if (filter === 'all') return true;
      return t.status === filter;
    });
  }, [tasks, filter]);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10 animate-in fade-in duration-700 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-2">
              <CheckSquare className="h-10 w-10 text-primary" />
              Operations Center
            </h1>
            <p className="text-muted-foreground font-medium">Daily workflows and AI-verified operations.</p>
          </div>
          {isManagerOrAdmin && !isOwner && (
            <Button
              size="lg"
              className="h-14 px-8 rounded-2xl shadow-xl hover:scale-105 transition-all"
              onClick={handleCreateNewTask}
              disabled={isCreatingNewTask} // Disable button when creating a new task
            >
              {isCreatingNewTask ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />} New Operational Duty
            </Button>
          )}
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="bg-muted/50 p-1 mb-8 overflow-x-auto flex flex-wrap h-auto w-full justify-start">
            <TabsTrigger value="all" className="px-6 rounded-xl">All Duties</TabsTrigger>
            <TabsTrigger value="pending" className="px-6 rounded-xl">Pending</TabsTrigger>
            <TabsTrigger value="in_progress" className="px-6 rounded-xl">In Progress</TabsTrigger>
            <TabsTrigger value="completed" className="px-6 rounded-xl">Completed</TabsTrigger>
            {isManagerOrAdmin && (
              <>
                <TabsTrigger value="templates" className="px-6 rounded-xl gap-2"><Repeat className="h-4 w-4" /> Routines</TabsTrigger>
                <TabsTrigger value="performance" className="px-6 rounded-xl gap-2 text-primary font-black"><TrendingUp className="h-4 w-4" /> Performance Insight</TabsTrigger>
              </>
            )}
          </TabsList>
          <TabsContent value="performance">
            <div className="grid gap-6">
              <Card className="bg-slate-900 text-white border-none rounded-[2.5rem] p-8 overflow-hidden relative">
                <div className="absolute right-0 top-0 p-8 opacity-10"><BrainCircuit className="h-32 w-32" /></div>
                <CardHeader className="p-0 mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">AI Efficiency Analysis</span>
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tighter">Response Time Leaderboard</CardTitle>
                  <CardDescription className="text-slate-400 font-bold">Fastest team members resolving QR Customer Requests.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {performanceMetrics.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="h-10 w-10 flex items-center justify-center font-black text-xl text-primary/50">#{idx + 1}</div>
                      <div className="flex-1">
                        <p className="font-black text-lg">{m.name}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-emerald-400">{(m.avgResponseMs / 60000).toFixed(1)}m</p>
                        <p className="text-[10px] text-slate-500 font-bold">AVG RESPONSE</p>
                      </div>
                    </div>
                  ))}
                  {performanceMetrics.length === 0 && <p className="text-center py-12 text-slate-500 italic">No QR performance data recorded yet.</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value={filter === 'performance' ? 'all' : filter} className="m-0 space-y-4">
            {filteredTasks.length > 0 ? (
              <div className="grid gap-4">
                {filteredTasks.map((task) => {
                  const isLoadingAction = isProcessingAction === task.id;
                  return (
                    <Card key={task.id} className="group hover:shadow-xl transition-all border-none shadow-sm rounded-3xl overflow-hidden relative">
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row p-6 gap-6">
                          <button
                            disabled={isLoadingAction || isOwner}
                            onClick={() => handleUpdateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            className="mt-1 flex-shrink-0 hover:scale-110 transition-transform disabled:opacity-50"
                          >
                            {isLoadingAction ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
                              task.status === 'completed' ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className={cn("text-lg font-bold truncate", task.status === 'completed' && "line-through text-muted-foreground")}>{task.title}</h3>
                              {task.isAiVerified && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-2 rounded-full text-[10px] font-black uppercase">
                                  <Sparkles className="h-3 w-3 mr-1" /> AI Verified
                                </Badge>
                              )}
                              {task.qrCodeId && <Badge className="bg-purple-500/10 text-purple-600 border-none px-2 text-[10px] font-black uppercase">QR Request</Badge>}
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground leading-relaxed mb-4">{task.description}</p>}
                            {task.checklist && task.checklist.length > 0 && (
                              <div className="bg-muted/30 p-4 rounded-2xl space-y-2 mb-6 border border-border/40">
                                {task.checklist.map(item => (
                                  <div key={item.id} className={cn("flex items-start space-x-3 p-2 rounded-xl transition-colors", item.completed ? "bg-emerald-500/5" : "hover:bg-background/50")}>
                                    <Checkbox
                                      checked={item.completed}
                                      onCheckedChange={(checked) => handleToggleChecklistItem(task.id, item.id, !!checked)}
                                      className="mt-1"
                                      disabled={isOwner}
                                    />
                                    <span className={cn("text-sm font-bold", item.completed ? "text-muted-foreground line-through" : "text-foreground")}>{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> {format(new Date(task.createdAt), 'MMM d')}</span>
                              <Badge variant="outline" className="border-border/60 text-[9px] uppercase">{task.priority}</Badge>
                              {task.status === 'completed' && task.completedAt && (
                                <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  <CheckSquare className="h-3 w-3" /> Resolved @ {format(new Date(task.completedAt), 'h:mm a')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0 pt-1">
                             {!isOwner && (
                               <>
                                {task.status === 'pending' && <Button size="sm" onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="rounded-xl h-10 px-6 font-bold shadow-md">Claim Duty</Button>}
                                {task.status === 'in_progress' && <Button size="sm" onClick={() => handleUpdateStatus(task.id, 'completed')} className="rounded-xl h-10 px-6 font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg">Finalize Completion</Button>}
                               </>
                             )}
                             {isManagerOrAdmin && (
                               <Button variant="outline" size="sm" onClick={() => setEditingTask(task)} className="rounded-xl h-10 px-4">
                                  <Edit3 className="h-4 w-4 mr-2" /> Edit
                               </Button>
                             )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl">
                <CheckSquare className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-bold">Queue Empty</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">All operational duties are current.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <EditTaskModal 
          isOpen={!!editingTask} 
          onClose={() => setEditingTask(null)} 
          task={editingTask} 
        />
      </div>
    </AppLayout>
  );
}