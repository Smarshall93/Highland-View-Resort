import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, User, MapPin, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Shift } from '@shared/types';
export function SchedulePage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const users = useDataStore(s => s.users);
  const shifts = useDataStore(s => s.shifts);
  const workSites = useDataStore(s => s.workSites);
  const syncData = useDataStore(s => s.syncData);
  const addShiftLocal = useDataStore(s => s.addShiftLocal);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Form State
  const [targetUserId, setTargetUserId] = useState('');
  const [shiftDate, setShiftDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [siteId, setSiteId] = useState('');
  const isManager = currentUserRole === 'admin' || currentUserRole === 'manager';
  useEffect(() => {
    if (currentUserId) syncData(currentUserId, currentUserRole);
  }, [currentUserId, currentUserRole, syncData]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !shiftDate || !startTime || !endTime) return;
    setIsSaving(true);
    try {
      const startTs = new Date(`${shiftDate}T${startTime}`).getTime();
      const endTs = new Date(`${shiftDate}T${endTime}`).getTime();
      const payload: Partial<Shift> = {
        userId: targetUserId,
        startTime: startTs,
        endTime: endTs,
        workSiteId: siteId || undefined,
        status: 'published'
      };
      const created = await api<Shift>('/api/shifts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      addShiftLocal(created);
      toast.success('Shift scheduled successfully');
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Failed to schedule shift');
    } finally {
      setIsSaving(false);
    }
  };
  const handleAcknowledge = async (shiftId: string) => {
    try {
      await api(`/api/shifts/${shiftId}`, {
        method: 'PATCH',
        body: JSON.stringify({ acknowledgedAt: Date.now() })
      });
      useDataStore.getState().updateShiftLocal(shiftId, { acknowledgedAt: Date.now() });
      toast.success('Shift acknowledged');
    } catch (err) {
      toast.error('Action failed');
    }
  };
  const getShiftsForDayAndUser = (day: Date, uid: string) => {
    return shifts.filter(s => s.userId === uid && isSameDay(new Date(s.startTime), day));
  };
  const displayUsers = isManager ? users : users.filter(u => u.id === currentUserId);
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-primary" />
              Workforce Schedule
            </h1>
            <p className="text-muted-foreground mt-1">Plan shifts and track team availability.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-sm min-w-[140px] text-center">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {isManager && (
              <Button onClick={() => setIsModalOpen(true)} className="ml-4 shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Add Shift
              </Button>
            )}
          </div>
        </div>
        <div className="bg-card border rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="p-4 text-left font-bold text-sm min-w-[200px] sticky left-0 bg-background z-10">Team Member</th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="p-4 text-center min-w-[160px]">
                      <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider">{format(day, 'EEE')}</div>
                      <div className={`text-xl font-black mt-1 h-10 w-10 mx-auto flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground shadow-lg' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayUsers.map(user => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 sticky left-0 bg-background/95 backdrop-blur z-10 border-r">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center border-2 border-background shadow-sm overflow-hidden">
                          {user.avatarUrl ? <img src={user.avatarUrl} className="h-full w-full object-cover" alt={user.name}/> : <User className="h-5 w-5 text-muted-foreground"/>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">{user.role}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dayShifts = getShiftsForDayAndUser(day, user.id);
                      return (
                        <td key={day.toISOString()} className="p-2 border-r last:border-r-0 h-32">
                          <div className="flex flex-col gap-2 h-full">
                            {dayShifts.map(s => (
                              <div key={s.id} className="p-2 rounded-xl bg-primary/5 border border-primary/20 shadow-sm text-[10px] relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                <p className="font-black text-primary flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(s.startTime), 'h:mm a')} - {format(new Date(s.endTime), 'h:mm a')}
                                </p>
                                {s.workSiteId && (
                                  <p className="mt-1 text-muted-foreground font-medium flex items-center gap-1">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {workSites.find(ws => ws.id === s.workSiteId)?.name || 'Resort'}
                                  </p>
                                )}
                                {s.userId === currentUserId && !s.acknowledgedAt && (
                                  <Button size="sm" variant="outline" className="mt-2 w-full h-6 text-[10px] rounded-lg" onClick={() => handleAcknowledge(s.id)}>
                                    Acknowledge
                                  </Button>
                                )}
                                {s.acknowledgedAt && (
                                  <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-600 border-emerald-200 text-[8px] px-1.5 py-0 h-4">
                                    <CheckCircle2 className="h-2 w-2 mr-1" /> Confirmed
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Create Shift Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateShift}>
            <DialogHeader>
              <DialogTitle>Schedule Shift</DialogTitle>
              <DialogDescription>Assign a new working block to an employee.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Work Site</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger><SelectValue placeholder="Resort Main" /></SelectTrigger>
                  <SelectContent>
                    {workSites.map(ws => <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}