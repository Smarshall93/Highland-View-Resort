import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, CheckCircle2, CheckSquare, Calendar, Shield, Activity, Edit, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { LocationMap } from '@/components/LocationMap';
import { EditProfileModal } from '@/components/EditProfileModal';
import type { TaskPriority } from '@shared/types';
interface EmployeeDetailsSheetProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
const formatTaskDuration = (ms: number) => {
  if (!ms || ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
};
export function EmployeeDetailsSheet({ userId, isOpen, onClose }: EmployeeDetailsSheetProps) {
  const users = useDataStore(s => s.users);
  const timeEntries = useDataStore(s => s.timeEntries);
  const tasks = useDataStore(s => s.tasks);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const user = useMemo(() => users.find(u => u.id === userId), [users, userId]);
  const userEntries = useMemo(() => {
    if (!userId) return [];
    return timeEntries
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15);
  }, [timeEntries, userId]);
  const userTasks = useMemo(() => {
    if (!userId || !user) return [];
    const roleIds = user.shiftRoles?.map(r => r.id) || [];
    return tasks
      .filter(t => t.assignees?.includes(userId) || t.assignedRoles?.some(r => roleIds.includes(r)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15);
  }, [tasks, userId, user]);
  const currentStatus = useMemo(() => {
    if (userEntries.length === 0) return 'off';
    const lastEntry = userEntries[0];
    if (lastEntry.type === 'clock_in' || lastEntry.type === 'break_end') return 'working';
    if (lastEntry.type === 'break_start') return 'break';
    return 'off';
  }, [userEntries]);
  if (!user && isOpen) return null;
  const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const getPriorityBadge = (priority?: TaskPriority) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-200 shadow-sm border px-1.5 h-4 text-[10px]"><AlertCircle className="w-2.5 h-2.5 mr-1" /> Urgent</Badge>;
      case 'high': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 shadow-sm px-1.5 h-4 text-[10px]">High</Badge>;
      case 'low': return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-200 shadow-sm px-1.5 h-4 text-[10px]">Low</Badge>;
      case 'medium':
      default: return null;
    }
  };
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col p-0">
        <SheetHeader className="p-6 border-b bg-muted/20 sticky top-0 z-10 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-16 w-16 rounded-xl border-2 border-background shadow-sm bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user?.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">{user ? getInitials(user.name) : ''}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl truncate">{user?.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={user?.role === 'admin' ? 'destructive' : user?.role === 'manager' ? 'default' : 'secondary'} className="capitalize text-[10px] px-1.5 py-0 h-4">
                    {user?.role}
                  </Badge>
                  <SheetDescription className="text-xs truncate">
                    ID: {user?.id.split('-')[0]}
                  </SheetDescription>
                </div>
              </div>
            </div>
            {isManagerOrAdmin && (
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="shrink-0">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Status:</span>
            </div>
            <Badge
              variant="outline"
              className={`capitalize px-2 py-0.5 ${
                currentStatus === 'working' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                currentStatus === 'break' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              {currentStatus === 'working' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
              {currentStatus === 'break' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />}
              {currentStatus === 'off' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />}
              {currentStatus === 'working' ? 'On Clock' : currentStatus === 'break' ? 'On Break' : 'Off Clock'}
            </Badge>
          </div>
        </SheetHeader>
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="punches" className="flex-1 flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
              <TabsTrigger value="punches">Recent Punches</TabsTrigger>
              <TabsTrigger value="tasks">Assigned Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="punches" className="flex-1 overflow-y-auto m-0 pr-2">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {userEntries.length > 0 ? (
                  userEntries.map((entry) => (
                    <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {entry.type === 'clock_in' ? <Clock className="h-4 w-4 text-emerald-500" /> :
                         entry.type === 'clock_out' ? <CheckCircle2 className="h-4 w-4 text-slate-500" /> :
                         <Clock className="h-4 w-4 text-amber-500" />}
                      </div>
                      <Card className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] shadow-sm group-hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">
                              {entry.type === 'clock_in' ? 'Clocked In' : entry.type === 'break_start' ? 'Started Break' : entry.type === 'break_end' ? 'Ended Break' : 'Clocked Out'}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{format(new Date(entry.timestamp), 'MMM d, yyyy')}</span>
                            {entry.location && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-slate-50 border-slate-200">
                                <MapPin className="w-3 h-3 mr-0.5" /> GPS
                              </Badge>
                            )}
                            {entry.status === 'verified' && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-emerald-50 border-emerald-200 text-emerald-600">
                                <Shield className="w-3 h-3 mr-0.5" /> {entry.verificationMethod === 'face' ? 'Face ID' : 'PIN'}
                              </Badge>
                            )}
                          </div>
                          {entry.location && (
                            <div className="mt-3 h-48 sm:h-56 w-full rounded-xl overflow-hidden border-2 shadow-sm relative transition-all hover:shadow-md hover:border-primary/50">
                              <LocationMap lat={entry.location.lat} lng={entry.location.lng} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center border-2 border-dashed rounded-xl z-10 relative bg-background/50">
                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                    No recent time entries.
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="flex-1 overflow-y-auto m-0 pr-2">
              <div className="space-y-3">
                {userTasks.length > 0 ? (
                  userTasks.map((task) => (
                    <div key={task.id} className="p-3 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-sm font-semibold leading-tight ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                          {getPriorityBadge(task.priority)}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 ${
                              task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                              task.status === 'in_progress' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                              task.status === 'pending' && (task.timeSpentMs || 0) > 0 ? 'bg-slate-100 text-slate-700 border-slate-300' :
                              'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {task.status === 'pending' && (task.timeSpentMs || 0) > 0 ? 'Paused' : task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          Created {format(new Date(task.createdAt), 'MMM d')}
                        </span>
                        {(task.timeSpentMs || 0) > 0 && (
                          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <Clock className="h-3 w-3" />
                            {formatTaskDuration(task.timeSpentMs || 0)} spent
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center border-2 border-dashed rounded-xl">
                    <CheckSquare className="h-8 w-8 mb-2 opacity-20" />
                    No tasks assigned currently.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
      {user && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          userToEdit={user}
        />
      )}
    </Sheet>
  );
}