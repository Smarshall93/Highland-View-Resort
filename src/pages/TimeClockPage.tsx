import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, CheckCircle2, AlertCircle, Play, Square, Coffee, MonitorSmartphone, Info, Image as ImageIcon, Download, Maximize2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ClockInModal } from '@/components/ClockInModal';
import { EmployeeDetailsSheet } from '@/components/EmployeeDetailsSheet';
import { LocationMap } from '@/components/LocationMap';
import type { TimeEntry, TimeEntryType } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { Link, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
export function TimeClockPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TimeEntryType>('clock_in');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const userId = useAuthStore(s => s.user?.id);
  const userRole = useAuthStore(s => s.user?.role);
  const allEntries = useDataStore(s => s.timeEntries);
  const users = useDataStore(s => s.users);
  const addTimeEntryLocal = useDataStore(s => s.addTimeEntryLocal);
  const syncData = useDataStore(s => s.syncData);
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (userId && userRole) {
      syncData(userId, userRole);
    }
  }, [userId, userRole, syncData]);
  useEffect(() => {
    if (searchParams.get('auto') === 'clock_in') {
      handleActionClick('clock_in');
      searchParams.delete('auto');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const recentEntries = useMemo(() => {
    let items = [...allEntries];
    if (userRole === 'employee') {
      items = items.filter(e => e.userId === userId);
    }
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
  }, [allEntries, userId, userRole]);
  const currentStatus = useMemo(() => {
    if (!userId) return 'off';
    const ownEntries = allEntries.filter(e => e.userId === userId);
    const lastEntry = ownEntries.sort((a, b) => b.timestamp - a.timestamp)[0];
    if (lastEntry) {
      if (lastEntry.type === 'clock_in' || lastEntry.type === 'break_end') {
        return 'working';
      } else if (lastEntry.type === 'break_start') {
        return 'break';
      }
    }
    return 'off';
  }, [allEntries, userId]);
  const handleActionClick = (type: TimeEntryType) => {
    setModalType(type);
    setIsModalOpen(true);
  };
  const handleModalSuccess = (entry: TimeEntry) => {
    addTimeEntryLocal(entry);
    if (userId && userRole) syncData(userId, userRole);
  };
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Time Clock & Operations</h1>
            <p className="text-muted-foreground">Manage shifts using GPS and Face ID verification.</p>
          </div>
          {isManagerOrAdmin && (
            <Button asChild variant="outline" className="shadow-sm hover:shadow-md transition-all">
              <Link to="/reports">
                <Download className="mr-2 h-4 w-4" /> Export Timesheets
              </Link>
            </Button>
          )}
        </div>
        {/* Updated Informational Privacy Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex flex-col sm:flex-row items-start gap-4 border border-blue-200 dark:border-blue-800/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800/50 shrink-0">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-sm">Location Privacy Notice</h3>
            <p className="text-sm leading-relaxed text-blue-700 dark:text-blue-300/90">
              Your location is <strong>only recorded during active work actions</strong> (clocking in/out, claiming, or completing tasks). Continuous live-tracking is disabled, and all GPS monitoring strictly ceases the moment you clock out.
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <Card className="border-2 shadow-md overflow-hidden flex flex-col w-full h-fit sticky top-20">
            <div className={`h-2 w-full ${
              currentStatus === 'working' ? 'bg-emerald-500' :
              currentStatus === 'break' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            }`} />
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Current Time
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 flex-1">
              <div className="text-6xl md:text-8xl font-display font-bold tracking-tighter text-foreground mb-2">
                {format(currentTime, 'HH:mm')}
                <span className="text-3xl md:text-4xl text-muted-foreground ml-2 font-normal">
                  {format(currentTime, 'ss')}
                </span>
              </div>
              <div className="text-lg text-muted-foreground font-medium mb-8">
                {format(currentTime, 'EEEE, MMMM do, yyyy')}
              </div>
              <Badge
                variant="outline"
                className={`px-4 py-1.5 text-sm font-medium mb-8 ${
                  currentStatus === 'working' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' :
                  currentStatus === 'break' ? 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800' :
                  'bg-secondary text-secondary-foreground'
                }`}
              >
                {currentStatus === 'working' && <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" /> On the clock</span>}
                {currentStatus === 'break' && <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> On break</span>}
                {currentStatus === 'off' && <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-2" /> Off the clock</span>}
              </Badge>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 w-full max-w-md">
                {currentStatus === 'off' ? (
                  <Button
                    size="lg"
                    className="col-span-1 sm:col-span-2 h-20 text-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 w-full rounded-2xl"
                    onClick={() => handleActionClick('clock_in')}
                  >
                    <Play className="mr-3 h-6 w-6 fill-current" /> Clock In
                  </Button>
                ) : currentStatus === 'working' ? (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-20 text-xl border-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 hover:text-amber-700 dark:text-amber-500 w-full rounded-2xl"
                      onClick={() => handleActionClick('break_start')}
                    >
                      <Coffee className="mr-3 h-6 w-6" /> Start Break
                    </Button>
                    <Button
                      size="lg"
                      className="h-20 text-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 shadow-lg w-full rounded-2xl"
                      onClick={() => handleActionClick('clock_out')}
                    >
                      <Square className="mr-3 h-6 w-6 fill-current" /> Clock Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="h-20 text-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg w-full rounded-2xl"
                      onClick={() => handleActionClick('break_end')}
                    >
                      <Play className="mr-3 h-6 w-6 fill-current" /> End Break
                    </Button>
                    <Button
                      size="lg"
                      className="h-20 text-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 shadow-lg w-full rounded-2xl"
                      onClick={() => handleActionClick('clock_out')}
                    >
                      <Square className="mr-3 h-6 w-6 fill-current" /> Clock Out
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="shadow-sm w-full">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  {userRole === 'employee' ? "Your Recent Activity" : "Activity Audit Trail"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-8">
                  {recentEntries.length > 0 ? (
                    <div className="relative border-l-2 border-muted ml-4 pl-6 space-y-8">
                      {recentEntries.map((entry) => {
                        const entryUser = users.find(u => u.id === entry.userId);
                        return (
                          <div
                            key={entry.id}
                            className={`relative group ${isManagerOrAdmin ? 'cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors' : ''}`}
                            onClick={() => isManagerOrAdmin && setSelectedUserId(entry.userId)}
                          >
                            <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 border-background shadow-sm ${
                              entry.type === 'clock_in' ? 'bg-emerald-500' :
                              entry.type === 'break_start' ? 'bg-amber-500' :
                              entry.type === 'break_end' ? 'bg-blue-500' :
                              'bg-slate-500'
                            }`} />
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 flex flex-col">
                                <span className="text-base font-semibold flex items-center gap-2">
                                  {entry.type === 'clock_in' ? 'Clocked In' :
                                   entry.type === 'break_start' ? 'Started Break' :
                                   entry.type === 'break_end' ? 'Ended Break' :
                                   'Clocked Out'}
                                  {userRole !== 'employee' && (
                                    <span className="text-muted-foreground font-normal text-sm">
                                      · {entryUser?.name || entry.userId.substring(0, 4)}
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center mt-1 gap-3 text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {format(new Date(entry.timestamp), 'h:mm a')}
                                  </span>
                                  <span>·</span>
                                  <span>{format(new Date(entry.timestamp), 'MMM d')}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {entry.status === 'verified' && entry.verificationMethod === 'pin' ? (
                                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                                      <span className="mr-1">#</span> PIN Verified
                                    </Badge>
                                  ) : entry.status === 'verified' ? (
                                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Face Verified
                                    </Badge>
                                  ) : null}
                                  {entry.location && (
                                    <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {entry.location.lat.toFixed(4)}, {entry.location.lng.toFixed(4)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 flex gap-2">
                                {entry.location && (
                                  <div className="h-28 w-28 sm:h-32 sm:w-40 rounded-xl overflow-hidden border-2 border-muted bg-muted/50 shadow-sm relative hover:border-primary/50 transition-all">
                                    <LocationMap lat={entry.location.lat} lng={entry.location.lng} />
                                  </div>
                                )}
                                {entry.photoUrl && (
                                  <div className="h-28 w-28 sm:h-32 sm:w-40 rounded-xl overflow-hidden border-2 border-muted bg-muted/50 shadow-sm relative hover:border-primary/50 transition-all cursor-pointer group" onClick={() => setSelectedImage(entry.photoUrl!)}>
                                    <img src={entry.photoUrl} alt="Verification" className="h-full w-full object-cover group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Maximize2 className="h-6 w-6" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                      <Clock className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-base font-medium text-foreground">No activity found</p>
                      <p className="text-sm mt-1">Time punches will appear here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {isManagerOrAdmin && !isMobile && (
              <div className="flex flex-col items-center justify-between gap-4 p-5 sm:p-6 bg-muted/40 rounded-xl border-2 border-dashed shadow-sm">
                <div className="text-center w-full">
                  <h3 className="font-semibold text-lg mb-2 text-foreground flex items-center justify-center gap-2">
                    <MonitorSmartphone className="h-5 w-5 text-primary" />
                    Shared Device Kiosk
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    Launch the dedicated full-screen kiosk interface for on-site shared tablets or phones.
                  </p>
                  <Button asChild className="w-full shadow-sm hover:shadow-md transition-all h-12 text-base">
                    <Link to="/kiosk">
                      Launch Kiosk Mode
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ClockInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        type={modalType}
      />
      <EmployeeDetailsSheet
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-1 flex flex-col bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Picture Viewer</DialogTitle>
            <DialogDescription>Full screen view of the captured photo</DialogDescription>
          </DialogHeader>
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {selectedImage && <img src={selectedImage} alt="Full screen view" className="max-w-full max-h-full object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}