import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, Calendar as CalendarIcon, AlertCircle, Users, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckSquare, BarChart3, ListTodo, Edit } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parse } from 'date-fns';
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
function calculateDistance(loc1: Location, loc2: Location) {
  const R = 6371e3; // metres
  const φ1 = loc1.lat * Math.PI / 180;
  const φ2 = loc2.lat * Math.PI / 180;
  const Δφ = (loc2.lat - loc1.lat) * Math.PI / 180;
  const Δλ = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in metres
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
  useEffect(() => {
    if (userId && (userRole === 'admin' || userRole === 'manager')) {
      syncData(userId, userRole);
    }
  }, [userId, userRole, syncData]);
  const toggleExpand = (uid: string) => {
    setExpandedUsers(prev => ({ ...prev, [uid]: !prev[uid] }));
  };
  const openEditor = (uid: string, uName: string, dateStr: string) => {
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
        return {
          start: customRange?.from || new Date(),
          end: customRange?.to || customRange?.from || new Date()
        };
      case 'all_time':
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
      if (!data[e.userId]) {
        const knownUser = users.find(u => u.id === e.userId);
        data[e.userId] = {
          id: e.userId,
          name: knownUser?.name || `Unknown User (${e.userId.substring(0, 4)})`,
          role: knownUser?.role || 'unknown',
          totalMs: 0,
          totalHours: 0,
          entries: 0,
          dailyRecords: []
        };
      }
    });
    Object.keys(userEntries).forEach(uid => {
      const entries = userEntries[uid];
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
        } else if (firstClockIn?.location) {
           const clockInLoc = firstClockIn.location;
           const breakLoc = firstBreakStart?.location || lastBreakEnd?.location;
           if (breakLoc) {
             const dist = calculateDistance(clockInLoc, breakLoc);
             lunchLocation = dist > 150 ? 'Off-Property' : 'On-Property';
           }
        }
        const deviceType = firstClockIn?.deviceType ? firstClockIn.deviceType.charAt(0).toUpperCase() + firstClockIn.deviceType.slice(1) : '-';
        let dayTotalMs = 0;
        let lastIn: number | null = null;
        dayEntries.forEach(e => {
          if (e.type === 'clock_in' || e.type === 'break_end') {
            lastIn = e.timestamp;
          } else if ((e.type === 'clock_out' || e.type === 'break_start') && lastIn) {
            dayTotalMs += (e.timestamp - lastIn);
            lastIn = null;
          }
        });
        // Add ongoing time if still working and current time is within date range
        if (lastIn && isWithinInterval(new Date(), { start: dateRange.start, end: dateRange.end })) {
           const ongoingMs = Date.now() - lastIn;
           // Safety check: Don't add more than 24h for a single ongoing segment
           dayTotalMs += Math.min(ongoingMs, 24 * 60 * 60 * 1000);
        }
        let lunchDurationMs = 0;
        if (firstBreakStart && lastBreakEnd && lastBreakEnd.timestamp >= firstBreakStart.timestamp) {
            lunchDurationMs = lastBreakEnd.timestamp - firstBreakStart.timestamp;
        }
        // Fallback
        if (firstBreakStart && !lastBreakEnd && isWithinInterval(new Date(), { start: dateRange.start, end: dateRange.end })) {
            lunchDurationMs = Date.now() - firstBreakStart.timestamp;
        }
        const lunchDurationHours = lunchDurationMs / (1000 * 60 * 60);
        overallTotalMs += dayTotalMs;
        dailyRecords.push({
          dateStr,
          clockIn: firstClockIn ? firstClockIn.timestamp : null,
          breakStart: firstBreakStart ? firstBreakStart.timestamp : null,
          breakEnd: lastBreakEnd ? lastBreakEnd.timestamp : null,
          clockOut: lastClockOut ? lastClockOut.timestamp : null,
          lunchLocation,
          deviceType,
          totalMs: dayTotalMs,
          totalHours: dayTotalMs / (1000 * 60 * 60),
          lunchDurationMs,
          lunchDurationHours
        });
      });
      data[uid].dailyRecords = dailyRecords.sort((a,b) => b.dateStr.localeCompare(a.dateStr));
      data[uid].totalMs = overallTotalMs;
      data[uid].totalHours = overallTotalMs / (1000 * 60 * 60);
    });
    return Object.values(data)
      .filter(u => u.entries > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [users, timeEntries, dateRange]);
  const taskReportData = useMemo(() => {
    const data: Record<string, UserTaskReport> = {};
    users.forEach(u => {
      data[u.id] = { id: u.id, name: u.name, role: u.role, assigned: 0, completed: 0, pending: 0, inProgress: 0, totalTimeMs: 0, totalTimeHours: 0 };
    });
    const relevantTasks = tasks.filter(t => isWithinInterval(new Date(t.createdAt), { start: dateRange.start, end: dateRange.end }));
    relevantTasks.forEach(t => {
      const taskAssignees = t.assignees?.length ? t.assignees : ['unassigned'];
      taskAssignees.forEach(assignee => {
        if (!data[assignee] && assignee !== 'unassigned') return;
        if (assignee === 'unassigned' && !data['unassigned']) {
          data['unassigned'] = { id: 'unassigned', name: 'Unassigned Tasks', role: '-', assigned: 0, completed: 0, pending: 0, inProgress: 0, totalTimeMs: 0, totalTimeHours: 0 };
        }
        const record = data[assignee];
        record.assigned++;
        if (t.status === 'completed') {
          record.completed++;
        } else if (t.status === 'in_progress') {
          record.inProgress++;
        } else {
          record.pending++;
        }
        record.totalTimeMs += (t.timeSpentMs || 0);
        record.totalTimeHours = record.totalTimeMs / (1000 * 60 * 60);
      });
    });
    return Object.values(data)
      .filter(d => d.assigned > 0)
      .sort((a, b) => b.completed - a.completed);
  }, [users, tasks, dateRange]);
  const handleExportTimesheetCSV = () => {
    const headers = ['Employee Name', 'Role', 'Date', 'Clock In', 'Device', 'Lunch Out', 'Lunch In', 'Lunch Duration (Hours)', 'Lunch Location', 'Clock Out', 'Daily Hours'];
    const rows: string[][] = [];
    reportData.forEach(userReport => {
      if (userReport.dailyRecords.length === 0) return;
      const escapedName = `"${userReport.name.replace(/"/g, '""')}"`;
      userReport.dailyRecords.forEach(day => {
         rows.push([
           escapedName,
           userReport.role,
           day.dateStr,
           day.clockIn ? format(new Date(day.clockIn), 'HH:mm:ss') : '-',
           day.deviceType,
           day.breakStart ? format(new Date(day.breakStart), 'HH:mm:ss') : '-',
           day.breakEnd ? format(new Date(day.breakEnd), 'HH:mm:ss') : '-',
           day.lunchDurationHours > 0 ? day.lunchDurationHours.toFixed(2) : '0.00',
           day.lunchLocation,
           day.clockOut ? format(new Date(day.clockOut), 'HH:mm:ss') : '-',
           day.totalHours.toFixed(2)
         ]);
      });
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheets_${period}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleExportTaskCSV = () => {
    const headers = ['Employee Name', 'Role', 'Tasks Assigned', 'Tasks Completed', 'Tasks In Progress', 'Tasks Pending', 'Completion Rate (%)', 'Total Time Spent (Hours)'];
    const rows: string[][] = [];
    taskReportData.forEach(userReport => {
      const escapedName = `"${userReport.name.replace(/"/g, '""')}"`;
      const completionRate = userReport.assigned > 0 ? ((userReport.completed / userReport.assigned) * 100).toFixed(1) : '0.0';
      rows.push([
        escapedName,
        userReport.role,
        userReport.assigned.toString(),
        userReport.completed.toString(),
        userReport.inProgress.toString(),
        userReport.pending.toString(),
        `${completionRate}%`,
        userReport.totalTimeHours.toFixed(2)
      ]);
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `task_reports_${period}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (!userId || (userRole !== 'admin' && userRole !== 'manager')) {
    return <Navigate to="/" replace />;
  }
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Organization Reports
            </h1>
            <p className="text-muted-foreground mt-1">Generate and export detailed data for timesheets and task operations.</p>
          </div>
        </div>
        <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    Report Settings
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                      <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="Select Period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current_week">Current Week</SelectItem>
                        <SelectItem value="last_week">Last Week</SelectItem>
                        <SelectItem value="bi_weekly">Bi-Weekly (Last 14 Days)</SelectItem>
                        <SelectItem value="current_month">Current Month</SelectItem>
                        <SelectItem value="current_year">Current Year</SelectItem>
                        <SelectItem value="all_time">All Time</SelectItem>
                        <SelectItem value="custom">Custom Range...</SelectItem>
                      </SelectContent>
                    </Select>
                    {period === 'custom' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[260px] justify-start text-left font-normal bg-background",
                              !customRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange?.from ? (
                              customRange.to ? (
                                <>
                                  {format(customRange.from, "LLL dd, y")} -{" "}
                                  {format(customRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(customRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background border" align="end">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={customRange?.from}
                            selected={customRange}
                            onSelect={(range) => setCustomRange(range)}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  {currentTab === 'timesheets' ? (
                    <Button onClick={handleExportTimesheetCSV} className="shadow-sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Timesheets
                    </Button>
                  ) : (
                    <Button onClick={handleExportTaskCSV} className="shadow-sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Task Report
                    </Button>
                  )}
                </div>
              </div>
              <TabsList className="mt-6">
                <TabsTrigger value="timesheets" className="px-6 gap-2">
                  <FileText className="h-4 w-4" /> Timesheets
                </TabsTrigger>
                <TabsTrigger value="tasks" className="px-6 gap-2">
                  <CheckSquare className="h-4 w-4" /> Task Reports
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-0">
              <TabsContent value="timesheets" className="m-0">
                {reportData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b">
                        <tr>
                          <th className="px-6 py-4 font-semibold w-10"></th>
                          <th className="px-6 py-4 font-semibold">Employee</th>
                          <th className="px-6 py-4 font-semibold">Role</th>
                          <th className="px-6 py-4 font-semibold text-right">Total Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.map((row) => (
                          <React.Fragment key={row.id}>
                            <tr 
                              className="hover:bg-muted/10 transition-colors cursor-pointer"
                              onClick={() => toggleExpand(row.id)}
                            >
                              <td className="px-6 py-4 text-muted-foreground">
                                 {expandedUsers[row.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </td>
                              <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                  {row.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="truncate">{row.name}</span>
                              </td>
                              <td className="px-6 py-4 capitalize text-muted-foreground">
                                {row.role}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {row.totalHours > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span className={
                                      (period === 'bi_weekly' && row.totalHours > 80) || 
                                      (period.includes('week') && period !== 'bi_weekly' && row.totalHours > 40) 
                                      ? 'text-amber-600 font-semibold text-base' : 'text-emerald-600 font-semibold text-base'
                                    }>
                                      {row.totalHours.toFixed(2)}h
                                    </span>
                                    <span className="text-xs text-muted-foreground font-medium">{formatDuration(row.totalHours)}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground font-semibold text-base">0.00h</span>
                                    <span className="text-xs text-muted-foreground font-medium">0h 0m</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {expandedUsers[row.id] && (
                              <tr>
                                 <td colSpan={4} className="p-0 bg-muted/5 border-b">
                                    <div className="p-4 pl-4 sm:pl-16 overflow-x-auto">
                                       {row.dailyRecords.length > 0 ? (
                                          <table className="w-full text-xs text-left border rounded-md overflow-hidden shadow-sm bg-background min-w-[800px]">
                                             <thead className="bg-muted/30 text-muted-foreground uppercase">
                                                <tr>
                                                   <th className="px-4 py-2 font-medium">Date</th>
                                                   <th className="px-4 py-2 font-medium">Clock In</th>
                                                   <th className="px-4 py-2 font-medium">Device</th>
                                                   <th className="px-4 py-2 font-medium text-amber-600">Lunch Out</th>
                                                   <th className="px-4 py-2 font-medium text-emerald-600">Lunch In</th>
                                                   <th className="px-4 py-2 font-medium">Lunch Total</th>
                                                   <th className="px-4 py-2 font-medium">Lunch Loc</th>
                                                   <th className="px-4 py-2 font-medium">Clock Out</th>
                                                   <th className="px-4 py-2 font-medium text-right">Daily Hrs</th>
                                                   <th className="px-4 py-2 font-medium text-right">Actions</th>
                                                </tr>
                                             </thead>
                                             <tbody className="divide-y divide-border">
                                                {row.dailyRecords.map((dr, idx) => (
                                                   <tr key={idx} className="hover:bg-muted/10 group/row">
                                                      <td className="px-4 py-2 font-medium">{dr.dateStr}</td>
                                                      <td className="px-4 py-2">
                                                        {dr.clockIn ? (
                                                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" />{format(new Date(dr.clockIn), 'h:mm a')}</span>
                                                        ) : '-'}
                                                      </td>
                                                      <td className="px-4 py-2 text-muted-foreground">{dr.deviceType}</td>
                                                      <td className="px-4 py-2 text-amber-600">{dr.breakStart ? format(new Date(dr.breakStart), 'h:mm a') : '-'}</td>
                                                      <td className="px-4 py-2 text-emerald-600">{dr.breakEnd ? format(new Date(dr.breakEnd), 'h:mm a') : '-'}</td>
                                                      <td className="px-4 py-2 font-medium text-slate-600">
                                                          {dr.lunchDurationHours > 0 ? formatDuration(dr.lunchDurationHours) : '-'}
                                                      </td>
                                                      <td className="px-4 py-2">
                                                         {dr.lunchLocation === 'Off-Property' ? (
                                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 bg-rose-500/10 text-rose-600 border-none flex items-center w-fit">
                                                              <AlertTriangle className="w-3 h-3 mr-1" /> Off-Property
                                                            </Badge>
                                                         ) : dr.lunchLocation === 'On-Property' ? (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-none">On-Property</Badge>
                                                         ) : '-'}
                                                      </td>
                                                      <td className="px-4 py-2">
                                                        {dr.clockOut ? (
                                                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-500" />{format(new Date(dr.clockOut), 'h:mm a')}</span>
                                                        ) : '-'}
                                                      </td>
                                                      <td className="px-4 py-2 text-right">
                                                        <div className="font-medium text-sm">{dr.totalHours.toFixed(2)}h</div>
                                                        <div className="text-[10px] text-muted-foreground">{formatDuration(dr.totalHours)}</div>
                                                      </td>
                                                      <td className="px-4 py-2 text-right">
                                                        {isManagerOrAdmin && (
                                                          <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover/row:opacity-100 transition-opacity"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              openEditor(row.id, row.name, dr.dateStr);
                                                            }}
                                                            title="Edit Punches"
                                                          >
                                                            <Edit className="h-3.5 w-3.5" />
                                                          </Button>
                                                        )}
                                                      </td>
                                                   </tr>
                                                ))}
                                             </tbody>
                                          </table>
                                       ) : (
                                          <div className="text-muted-foreground text-sm italic py-2">No entries for this period.</div>
                                       )}
                                       {isManagerOrAdmin && (
                                          <div className="mt-2 text-right w-full">
                                             <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                                               const todayStr = format(new Date(), 'yyyy-MM-dd');
                                               openEditor(row.id, row.name, todayStr);
                                             }}>
                                               <Edit className="h-3 w-3 mr-1.5" /> Edit / Add Manual Entry
                                             </Button>
                                          </div>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium">No Activity Found</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm">
                      There are no time punches for any employee matching the selected period.
                    </p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="tasks" className="m-0">
                {taskReportData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Employee</th>
                          <th className="px-6 py-4 font-semibold text-center">Assigned</th>
                          <th className="px-6 py-4 font-semibold text-center text-emerald-600">Completed</th>
                          <th className="px-6 py-4 font-semibold text-center text-amber-600">In Progress</th>
                          <th className="px-6 py-4 font-semibold text-center text-slate-500">Pending</th>
                          <th className="px-6 py-4 font-semibold text-right">Completion Rate</th>
                          <th className="px-6 py-4 font-semibold text-right">Time Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {taskReportData.map((row) => {
                          const completionRate = row.assigned > 0 ? (row.completed / row.assigned) * 100 : 0;
                          return (
                            <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                  {row.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="truncate">{row.name}</span>
                                  <span className="text-xs text-muted-foreground capitalize">{row.role}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center font-medium">
                                {row.assigned}
                              </td>
                              <td className="px-6 py-4 text-center font-medium text-emerald-600">
                                {row.completed}
                              </td>
                              <td className="px-6 py-4 text-center font-medium text-amber-600">
                                {row.inProgress}
                              </td>
                              <td className="px-6 py-4 text-center font-medium text-slate-500">
                                {row.pending}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-full max-w-[60px] h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${completionRate === 100 ? 'bg-emerald-500' : completionRate > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                      style={{ width: `${completionRate}%` }}
                                    />
                                  </div>
                                  <span className="font-semibold text-sm w-10">{completionRate.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {row.totalTimeHours > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-semibold text-base">
                                      {row.totalTimeHours.toFixed(2)}h
                                    </span>
                                    <span className="text-xs text-muted-foreground font-medium">{formatDuration(row.totalTimeHours)}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground font-semibold text-base">0.00h</span>
                                    <span className="text-xs text-muted-foreground font-medium">0h 0m</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ListTodo className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium">No Tasks Found</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm">
                      There are no tasks assigned to any employee matching the selected period.
                    </p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
            {((currentTab === 'timesheets' && reportData.length > 0) || (currentTab === 'tasks' && taskReportData.length > 0)) && (
              <CardFooter className="bg-muted/10 border-t p-4 flex justify-between text-xs text-muted-foreground">
                <span>Showing {currentTab === 'timesheets' ? reportData.length : taskReportData.length} records</span>
                {currentTab === 'timesheets' && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Click rows to expand daily logs
                  </span>
                )}
              </CardFooter>
            )}
          </Card>
        </Tabs>
        <DailyTimeEditorModal
          isOpen={editorModalOpen}
          onClose={() => setEditorModalOpen(false)}
          userId={editorUserId}
          userName={editorUserName}
          dateStr={editorDateStr}
        />
      </div>
    </AppLayout>
  );
}