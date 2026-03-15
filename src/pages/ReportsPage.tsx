import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, Calendar as CalendarIcon, AlertCircle, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckSquare, BarChart3, Edit, Shield } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Navigate, useSearchParams } from 'react-router-dom';
import type { Location } from '@shared/types';
import { DailyTimeEditorModal } from '@/components/DailyTimeEditorModal';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
type ReportPeriod = 'current_week' | 'last_week' | 'bi_weekly' | 'current_month' | 'current_year' | 'all_time' | 'custom';
interface DailyRecord {
  dateStr: string;
  clockIn: number | null;
  breakStart: number | null;
  breakEnd: number | null;
  clockOut: number | null;
  lunchLocation: 'On-Property' | 'Off-Property' | 'N/A';
  deviceType: string;
  totalMs: number;
  totalHours: number;
  lunchDurationMs: number;
  lunchDurationHours: number;
}
interface UserReport {
  id: string;
  name: string;
  role: string;
  totalMs: number;
  totalHours: number;
  entries: number;
  dailyRecords: DailyRecord[];
}
interface UserTaskReport {
  id: string;
  name: string;
  role: string;
  assigned: number;
  completed: number;
  pending: number;
  inProgress: number;
  totalTimeMs: number;
  totalTimeHours: number;
}
const formatDuration = (hours: number) => {
  if (!hours || hours <= 0) return '0h 0m';
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};
export function ReportsPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const userRole = useAuthStore((s) => s.user?.role);
  const users = useDataStore((s) => s.users);
  const timeEntries = useDataStore((s) => s.timeEntries);
  const tasks = useDataStore((s) => s.tasks);
  const syncData = useDataStore((s) => s.syncData);
  const [period, setPeriod] = useState<ReportPeriod>('current_week');
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  });
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'timesheets';
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorUserId, setEditorUserId] = useState<string>('');
  const [editorUserName, setEditorUserName] = useState<string>('');
  const [editorDateStr, setEditorDateStr] = useState<string>('');
  const isOwner = userRole === 'owner';
  const isEditor = userRole === 'admin' || userRole === 'manager';
  useEffect(() => {
    if (userId && (userRole === 'admin' || userRole === 'manager' || userRole === 'owner')) {
      syncData(userId, userRole);
    }
  }, [userId, userRole, syncData]);
  const toggleExpand = (uid: string) => {
    setExpandedUsers(prev => ({ ...prev, [uid]: !prev[uid] }));
  };
  const openEditor = (uid: string, uName: string, dateStr: string) => {
    if (isOwner) {
        toast.error("Read-Only Access", { description: "Owners cannot modify timesheets." });
        return;
    }
    setEditorUserId(uid);
    setEditorUserName(uName);
    setEditorDateStr(dateStr);
    setEditorModalOpen(true);
  };
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'current_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last_week':
        return { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) };
      case 'bi_weekly':
        return { start: startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'current_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return { start: customRange?.from || new Date(), end: customRange?.to || customRange?.from || new Date() };
      default:
        return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
    }
  }, [period, customRange]);
  const reportData = useMemo(() => {
    const data: Record<string, UserReport> = {};
    users.forEach(u => {
      data[u.id] = { id: u.id, name: u.name, role: u.role, totalMs: 0, totalHours: 0, entries: 0, dailyRecords: [] };
    });
    const relevantEntries = timeEntries
      .filter(e => isWithinInterval(new Date(e.timestamp), { start: dateRange.start, end: dateRange.end }))
      .sort((a, b) => a.timestamp - b.timestamp);
    const userEntries: Record<string, typeof relevantEntries> = {};
    relevantEntries.forEach(e => {
      if (!userEntries[e.userId]) userEntries[e.userId] = [];
      userEntries[e.userId].push(e);
    });
    Object.keys(userEntries).forEach(uid => {
      const entries = userEntries[uid];
      if (!data[uid]) return;
      data[uid].entries = entries.length;
      const entriesByDay: Record<string, typeof relevantEntries> = {};
      entries.forEach(e => {
        const dateStr = format(new Date(e.timestamp), 'yyyy-MM-dd');
        if (!entriesByDay[dateStr]) entriesByDay[dateStr] = [];
        entriesByDay[dateStr].push(e);
      });
      const dailyRecords: DailyRecord[] = [];
      let overallTotalMs = 0;
      Object.keys(entriesByDay).sort().forEach(dateStr => {
        const dayEntries = entriesByDay[dateStr];
        const firstClockIn = dayEntries.find(e => e.type === 'clock_in');
        const firstBreakStart = dayEntries.find(e => e.type === 'break_start');
        const lastBreakEnd = [...dayEntries].reverse().find(e => e.type === 'break_end');
        const lastClockOut = [...dayEntries].reverse().find(e => e.type === 'clock_out');
        let lunchLocation: 'On-Property' | 'Off-Property' | 'N/A' = 'N/A';
        if (firstBreakStart?.breakLocationPreference) {
           lunchLocation = firstBreakStart.breakLocationPreference === 'on-property' ? 'On-Property' : 'Off-Property';
        }
        let dayTotalMs = 0;
        let lastIn: number | null = null;
        dayEntries.forEach(e => {
          if (e.type === 'clock_in' || e.type === 'break_end') lastIn = e.timestamp;
          else if ((e.type === 'clock_out' || e.type === 'break_start') && lastIn) {
            dayTotalMs += (e.timestamp - lastIn);
            lastIn = null;
          }
        });
        overallTotalMs += dayTotalMs;
        dailyRecords.push({
          dateStr,
          clockIn: firstClockIn ? firstClockIn.timestamp : null,
          breakStart: firstBreakStart ? firstBreakStart.timestamp : null,
          breakEnd: lastBreakEnd ? lastBreakEnd.timestamp : null,
          clockOut: lastClockOut ? lastClockOut.timestamp : null,
          lunchLocation,
          deviceType: firstClockIn?.deviceType || '-',
          totalMs: dayTotalMs,
          totalHours: dayTotalMs / (1000 * 60 * 60),
          lunchDurationMs: (firstBreakStart && lastBreakEnd) ? lastBreakEnd.timestamp - firstBreakStart.timestamp : 0,
          lunchDurationHours: ((firstBreakStart && lastBreakEnd) ? lastBreakEnd.timestamp - firstBreakStart.timestamp : 0) / (1000 * 60 * 60)
        });
      });
      data[uid].dailyRecords = dailyRecords.sort((a,b) => b.dateStr.localeCompare(a.dateStr));
      data[uid].totalMs = overallTotalMs;
      data[uid].totalHours = overallTotalMs / (1000 * 60 * 60);
    });
    return Object.values(data).filter(u => u.entries > 0).sort((a, b) => b.totalHours - a.totalHours);
  }, [users, timeEntries, dateRange]);
  const taskReportData = useMemo(() => {
    const data: Record<string, UserTaskReport> = {};
    users.forEach(u => {
      data[u.id] = { id: u.id, name: u.name, role: u.role, assigned: 0, completed: 0, pending: 0, inProgress: 0, totalTimeMs: 0, totalTimeHours: 0 };
    });
    const relevantTasks = tasks.filter(t => isWithinInterval(new Date(t.createdAt), { start: dateRange.start, end: dateRange.end }));
    relevantTasks.forEach(t => {
      (t.assignees || ['unassigned']).forEach(assignee => {
        if (!data[assignee] && assignee !== 'unassigned') return;
        if (assignee === 'unassigned' && !data['unassigned']) {
          data['unassigned'] = { id: 'unassigned', name: 'Unassigned', role: '-', assigned: 0, completed: 0, pending: 0, inProgress: 0, totalTimeMs: 0, totalTimeHours: 0 };
        }
        const record = data[assignee];
        record.assigned++;
        if (t.status === 'completed') record.completed++;
        else if (t.status === 'in_progress') record.inProgress++;
        else record.pending++;
        record.totalTimeMs += (t.timeSpentMs || 0);
        record.totalTimeHours = record.totalTimeMs / (1000 * 60 * 60);
      });
    });
    return Object.values(data).filter(d => d.assigned > 0).sort((a, b) => b.completed - a.completed);
  }, [users, tasks, dateRange]);
  const handleExportCSV = () => {
    const headers = ['Employee', 'Role', 'Total Hours'];
    const rows = reportData.map(r => [r.name, r.role, r.totalHours.toFixed(2)]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };
  if (!userId || (!isEditor && !isOwner)) return <Navigate to="/" replace />;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-2">
              <BarChart3 className="h-10 w-10 text-primary" />
              Organization Reports
            </h1>
            <p className="text-muted-foreground font-medium text-lg">Detailed auditing for payroll and performance tracking.</p>
          </div>
        </div>
        {isOwner && (
            <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center gap-4 border border-slate-700 shadow-2xl animate-in slide-in-from-top-4">
                <Shield className="h-8 w-8 text-amber-400 shrink-0" />
                <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-widest text-amber-400">Security Clearance: Auditor</p>
                    <p className="text-slate-300 text-sm mt-1">
                      You have full read-only visibility into resort performance and payroll logs. Modification of time punches or task records is restricted to Resort Administrators.
                    </p>
                </div>
            </div>
        )}
        <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">
          <Card className="shadow-2xl rounded-[2.5rem] overflow-hidden border-none bg-card">
            <CardHeader className="bg-muted/30 border-b pb-4 p-8 lg:p-10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                <div>
                  <CardTitle className="text-3xl font-black tracking-tight">Report Configuration</CardTitle>
                  <CardDescription className="font-bold text-lg text-primary mt-1">
                    {format(dateRange.start, 'MMMM d')} - {format(dateRange.end, 'MMMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                      <SelectTrigger className="w-[220px] bg-background h-14 rounded-2xl border-2 font-bold text-base"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="current_week">Current Week</SelectItem>
                        <SelectItem value="last_week">Last Week</SelectItem>
                        <SelectItem value="current_month">Current Month</SelectItem>
                        <SelectItem value="custom">Custom Range...</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleExportCSV} className="h-14 px-8 rounded-2xl shadow-xl font-black text-base transition-all hover:scale-105"><Download className="h-5 w-5 mr-2" /> Export CSV</Button>
                </div>
              </div>
              <TabsList className="mt-10 bg-muted/50 p-1.5 rounded-2xl border border-border/50 h-auto">
                <TabsTrigger value="timesheets" className="px-10 py-3 rounded-xl font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">Payroll Timesheets</TabsTrigger>
                <TabsTrigger value="tasks" className="px-10 py-3 rounded-xl font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">Work Performance</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-0">
              <TabsContent value="timesheets" className="m-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 border-b text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <tr><th className="p-8 w-16"></th><th className="p-8">Team Member</th><th className="p-8">Role</th><th className="p-8 text-right">Logged Time</th></tr>
                  </thead>
                  <tbody className="divide-y border-b border-border/40">
                    {reportData.map((row) => (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-muted/10 cursor-pointer transition-colors group" onClick={() => toggleExpand(row.id)}>
                          <td className="p-8">{expandedUsers[row.id] ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}</td>
                          <td className="p-8 font-black text-lg text-slate-900 dark:text-white">{row.name}</td>
                          <td className="p-8"><Badge variant="outline" className="capitalize font-black text-[10px] px-3 py-1 bg-muted/30 border-none">{row.role}</Badge></td>
                          <td className="p-8 text-right font-black text-2xl text-primary">{row.totalHours.toFixed(2)}h</td>
                        </tr>
                        {expandedUsers[row.id] && (
                          <tr className="bg-muted/5">
                            <td colSpan={4} className="p-0">
                              <div className="p-10 pl-24">
                                <table className="w-full text-xs border-2 rounded-[2rem] bg-background overflow-hidden shadow-inner">
                                  <thead className="bg-muted/30 border-b">
                                    <tr className="font-black text-[9px] uppercase tracking-widest text-muted-foreground">
                                      <th className="p-4 pl-6">Date</th>
                                      <th className="p-4">Clock In</th>
                                      <th className="p-4">Clock Out</th>
                                      <th className="p-4 text-right pr-6">Daily total</th>
                                      <th className="p-4 w-12 pr-6"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {row.dailyRecords.map((dr, idx) => (
                                      <tr key={idx} className="group/row hover:bg-muted/10 transition-colors">
                                        <td className="p-5 pl-6 font-black text-sm">{dr.dateStr}</td>
                                        <td className="p-5 font-bold text-muted-foreground">{dr.clockIn ? format(new Date(dr.clockIn), 'h:mm a') : '-'}</td>
                                        <td className="p-5 font-bold text-muted-foreground">{dr.clockOut ? format(new Date(dr.clockOut), 'h:mm a') : '-'}</td>
                                        <td className="p-5 text-right pr-6 font-black text-base">{dr.totalHours.toFixed(2)}h</td>
                                        <td className="p-5 text-right pr-6">
                                          {isEditor && !isOwner && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-10 w-10 rounded-xl opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                                              onClick={(e) => { e.stopPropagation(); openEditor(row.id, row.name, dr.dateStr); }}
                                            >
                                              <Edit className="h-5 w-5" />
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {isEditor && !isOwner && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-8 h-12 px-8 rounded-2xl border-dashed border-2 hover:border-primary hover:bg-primary/5 font-black text-sm transition-all"
                                    onClick={() => openEditor(row.id, row.name, format(new Date(), 'yyyy-MM-dd'))}
                                  >
                                    Add Manual Entry
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {reportData.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-20 text-center text-muted-foreground font-black italic text-lg uppercase tracking-widest">
                                No payroll data recorded for this period.
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>
              <TabsContent value="tasks" className="m-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 border-b text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <tr><th className="p-8">Employee</th><th className="p-8 text-center">Assigned Duties</th><th className="p-8 text-center">Completion Rate</th><th className="p-8 text-right">Operational Time</th></tr>
                  </thead>
                  <tbody className="divide-y border-b border-border/40">
                    {taskReportData.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-8 font-black text-lg text-slate-900 dark:text-white">{row.name}</td>
                        <td className="p-8 text-center font-black text-lg">{row.assigned}</td>
                        <td className="p-8 text-center">
                           <div className="flex flex-col items-center justify-center gap-2">
                              <span className="text-emerald-600 font-black text-lg">{row.assigned > 0 ? Math.round((row.completed / row.assigned) * 100) : 0}%</span>
                              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${row.assigned > 0 ? (row.completed / row.assigned) * 100 : 0}%` }} />
                              </div>
                           </div>
                        </td>
                        <td className="p-8 text-right font-black text-2xl text-primary">{row.totalTimeHours.toFixed(1)}h</td>
                      </tr>
                    ))}
                    {taskReportData.length === 0 && (
                         <tr>
                             <td colSpan={4} className="p-20 text-center text-muted-foreground font-black italic text-lg uppercase tracking-widest">
                                 No performance metrics found.
                             </td>
                         </tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
        <DailyTimeEditorModal
          isOpen={editorModalOpen}
          onClose={() => setEditorModalOpen(false)}
          userId={editorUserId}
          userName={editorUserName}
          dateStr={editorDateStr}
        />
        <div className="text-center pt-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
           Built with ❤️ by Aurelia | Your AI Co-founder
        </div>
      </div>
    </AppLayout>
  );
}