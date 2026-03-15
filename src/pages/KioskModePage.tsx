import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, LogOut, Search, User as UserIcon, Play, Square, Coffee, CheckCircle2, MonitorSmartphone, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClockInModal } from '@/components/ClockInModal';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import type { User, TimeEntry, TimeEntryType } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
export function KioskModePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<'working' | 'break' | 'off' | 'loading'>('loading');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TimeEntryType>('clock_in');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Fetch all users on mount directly via API for the public kiosk
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api<{items: User[]}>('/api/users?limit=1000');
        setUsers(res.items || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load employee list');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);
  // Fetch specific user status when selected
  useEffect(() => {
    if (!selectedUser) return;
    const fetchUserStatus = async () => {
      setUserStatus('loading');
      try {
        const res = await api<{items: TimeEntry[]}>(`/api/time-entries?userId=${selectedUser.id}&limit=1`);
        const items = res.items || [];
        if (items.length > 0) {
          const lastEntry = items[0];
          if (lastEntry.type === 'clock_in' || lastEntry.type === 'break_end') {
            setUserStatus('working');
          } else if (lastEntry.type === 'break_start') {
            setUserStatus('break');
          } else {
            setUserStatus('off');
          }
        } else {
          setUserStatus('off');
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
        setUserStatus('off');
      }
    };
    fetchUserStatus();
  }, [selectedUser]);
  const handleActionClick = (type: TimeEntryType) => {
    setModalType(type);
    setIsModalOpen(true);
  };
  const handleModalSuccess = (entry: TimeEntry) => {
    toast.success(`Success, ${selectedUser?.name?.split(' ')[0]}! Resetting kiosk...`);
    setTimeout(() => {
      setSelectedUser(null);
      setSearchQuery('');
    }, 3000);
  };
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  };
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <MonitorSmartphone className="h-16 w-16 text-slate-500 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Device Not Supported</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          Kiosk Mode is designed for shared tablets and desktop computers. It is not available on mobile phones.
        </p>
        <Button
          size="lg"
          onClick={() => navigate('/login')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Go Back
        </Button>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden selection:bg-primary/30">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center shrink-0 bg-primary/20 rounded-xl border border-primary/30 text-primary">
            <Mountain className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-bookman">Highland View Resort Kiosk</h1>
            <p className="text-xs text-slate-400">Shared Device Mode</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/login')}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Exit Kiosk
        </Button>
      </header>
      <main className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
          <div className="text-[25vw] font-display font-bold whitespace-nowrap leading-none tracking-tighter">
            {format(currentTime, 'HH:mm')}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col z-10">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="text-5xl sm:text-7xl font-display font-bold tracking-tighter text-white mb-2 drop-shadow-md">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-lg sm:text-xl text-slate-400 font-medium">
                {format(currentTime, 'EEEE, MMMM do, yyyy')}
              </div>
            </div>
            <Card className="flex-1 flex flex-col shadow-2xl bg-slate-900/80 border-slate-800 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
              {!selectedUser ? (
                <div className="flex-1 flex flex-col p-6 sm:p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white">Who is clocking in?</h2>
                    <p className="text-slate-400 mt-2">Select your name to manage your shift.</p>
                  </div>
                  <div className="relative max-w-md mx-auto w-full mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      placeholder="Search employee name or ID..."
                      className="pl-10 h-14 text-lg bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-2xl focus-visible:ring-primary focus-visible:border-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-auto min-h-0 -mx-6 px-6">
                    {isLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <Skeleton key={i} className="h-32 rounded-2xl bg-slate-800/50" />
                        ))}
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                        {filteredUsers.map(user => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="group flex flex-col items-center p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-primary/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4 overflow-hidden shadow-inner group-hover:ring-4 group-hover:ring-primary/20 transition-all">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xl font-semibold text-slate-300">{getInitials(user.name)}</span>
                              )}
                            </div>
                            <span className="font-medium text-slate-200 text-center line-clamp-1 w-full">{user.name}</span>
                            <span className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{user.role}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                        <UserIcon className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg">No employees found.</p>
                        <p className="text-sm">Try a different search term.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-6 sm:p-10 items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                  <Button
                    variant="ghost"
                    className="absolute top-6 left-6 text-slate-400 hover:text-white"
                    onClick={() => setSelectedUser(null)}
                  >
                    ← Back to selection
                  </Button>
                  <div className="h-24 w-24 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center mb-6 overflow-hidden shadow-xl">
                    {selectedUser.avatarUrl ? (
                      <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-semibold text-slate-300">{getInitials(selectedUser.name)}</span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedUser.name}</h2>
                  {userStatus === 'loading' ? (
                    <div className="flex items-center justify-center h-8 mb-8">
                      <div className="animate-pulse bg-slate-800 h-6 w-32 rounded-full"></div>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`px-4 py-1.5 text-sm font-medium mb-10 border-2 ${
                        userStatus === 'working' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        userStatus === 'break' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        'bg-slate-800/50 text-slate-400 border-slate-700'
                      }`}
                    >
                      {userStatus === 'working' && <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" /> On the clock</span>}
                      {userStatus === 'break' && <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-2" /> On break</span>}
                      {userStatus === 'off' && <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-500 mr-2" /> Off the clock</span>}
                    </Badge>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                    {userStatus !== 'loading' && (
                      userStatus === 'off' ? (
                        <Button
                          size="lg"
                          className="col-span-1 sm:col-span-2 h-20 text-xl rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-900/50 hover:-translate-y-1 transition-all"
                          onClick={() => handleActionClick('clock_in')}
                        >
                          <Play className="mr-3 h-6 w-6 fill-current" /> Clock In
                        </Button>
                      ) : userStatus === 'working' ? (
                        <>
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-20 text-xl rounded-2xl bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-amber-400 hover:text-amber-300"
                            onClick={() => handleActionClick('break_start')}
                          >
                            <Coffee className="mr-3 h-6 w-6" /> Start Break
                          </Button>
                          <Button
                            size="lg"
                            className="h-20 text-xl rounded-2xl bg-slate-700 hover:bg-slate-600 text-white shadow-lg"
                            onClick={() => handleActionClick('clock_out')}
                          >
                            <Square className="mr-3 h-6 w-6 fill-current" /> Clock Out
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="lg"
                            className="h-20 text-xl rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                            onClick={() => handleActionClick('break_end')}
                          >
                            <Play className="mr-3 h-6 w-6 fill-current" /> End Break
                          </Button>
                          <Button
                            size="lg"
                            className="h-20 text-xl rounded-2xl bg-slate-700 hover:bg-slate-600 text-white shadow-lg"
                            onClick={() => handleActionClick('clock_out')}
                          >
                            <Square className="mr-3 h-6 w-6 fill-current" /> Clock Out
                          </Button>
                        </>
                      )
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
      <ClockInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        type={modalType}
        targetUser={selectedUser || undefined}
      />
    </div>
  );
}