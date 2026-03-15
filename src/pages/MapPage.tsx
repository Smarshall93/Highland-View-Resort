import React, { useState, useMemo, useEffect } from 'react';
import { Map as MapIcon, Users, MapPin, Navigation, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { LocationMap } from '@/components/LocationMap';
import { format } from 'date-fns';
export function MapPage() {
  const userRole = useAuthStore(s => s.user?.role);
  const currentUserId = useAuthStore(s => s.user?.id);
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
  const users = useDataStore(s => s.users);
  const timeEntries = useDataStore(s => s.timeEntries);
  const syncData = useDataStore(s => s.syncData);
  const [activeTab, setActiveTab] = useState('resort');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  useEffect(() => {
    if (currentUserId && isManagerOrAdmin) {
       syncData(currentUserId, userRole);
    }
  }, [currentUserId, userRole, syncData, isManagerOrAdmin]);
  const activeEmployees = useMemo(() => {
    if (!isManagerOrAdmin) return [];
    const active: any[] = [];
    users.forEach(u => {
      const uEntries = timeEntries.filter(e => e.userId === u.id).sort((a,b) => b.timestamp - a.timestamp);
      const latest = uEntries[0];
      if (latest && (latest.type === 'clock_in' || latest.type === 'break_end') && latest.location) {
        active.push({
          user: u,
          location: latest.location,
          timestamp: latest.timestamp
        });
      }
    });
    return active.sort((a,b) => b.timestamp - a.timestamp);
  }, [users, timeEntries, isManagerOrAdmin]);
  // Set default selected user
  useEffect(() => {
    if (activeEmployees.length > 0 && !selectedUserId) {
      setSelectedUserId(activeEmployees[0].user.id);
    }
  }, [activeEmployees, selectedUserId]);
  const selectedEmployee = useMemo(() => {
    return activeEmployees.find(e => e.user.id === selectedUserId);
  }, [activeEmployees, selectedUserId]);
  const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  return (
    <AppLayout container={false}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-3.5rem)] w-full bg-background relative">
        <div className="shrink-0 px-4 py-3 border-b bg-background/80 backdrop-blur z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
                <MapIcon className="h-4 w-4" />
             </div>
             <div>
                <h1 className="text-lg font-bold tracking-tight leading-none mb-1">Resort Map</h1>
                <p className="text-xs text-muted-foreground leading-none">View locations and facility layout.</p>
             </div>
          </div>
          {isManagerOrAdmin && (
             <TabsList className="h-9 self-start sm:self-auto">
                <TabsTrigger value="resort" className="text-xs px-4"><MapIcon className="h-3 w-3 mr-2"/> Facility Map</TabsTrigger>
                <TabsTrigger value="radar" className="text-xs px-4"><Navigation className="h-3 w-3 mr-2"/> Team Radar</TabsTrigger>
             </TabsList>
          )}
        </div>
        <TabsContent value="resort" className="flex-1 m-0 p-0 h-full border-none data-[state=active]:flex flex-col relative z-0">
          <iframe
            src="https://www.google.com/maps/d/embed?mid=1lAci5sgkeBEKbgCsRa9UB7jU6-DgTaw"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full flex-1"
            title="Resort Map"
          ></iframe>
        </TabsContent>
        {isManagerOrAdmin && (
           <TabsContent value="radar" className="flex-1 m-0 p-0 h-full border-none data-[state=active]:flex flex-col md:flex-row overflow-hidden relative z-0 bg-muted/10">
              <div className="w-full md:w-80 border-r md:border-b-0 border-b bg-card flex flex-col md:h-full h-1/3 shrink-0 shadow-sm z-10">
                <div className="p-4 border-b bg-muted/20 sticky top-0 shrink-0">
                  <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary"/> Active Team</h2>
                  <p className="text-xs text-muted-foreground mt-1">Currently clocked-in employees with GPS enabled</p>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto flex-1 min-h-0">
                   {activeEmployees.length > 0 ? activeEmployees.map(emp => (
                     <div key={emp.user.id} onClick={() => setSelectedUserId(emp.user.id)} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedUserId === emp.user.id ? 'bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/20' : 'bg-background hover:bg-muted/50 border-border/50'}`}>
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-secondary overflow-hidden shrink-0 border-2 border-background shadow-sm">
                              {emp.user.avatarUrl ? <img src={emp.user.avatarUrl} className="w-full h-full object-cover"/> : <span className="flex h-full items-center justify-center font-bold text-sm text-muted-foreground">{getInitials(emp.user.name)}</span>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-foreground">{emp.user.name}</p>
                              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Verified at {format(new Date(emp.timestamp), 'h:mm a')}</p>
                           </div>
                        </div>
                     </div>
                   )) : (
                     <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center justify-center h-full">
                       <MapPin className="h-8 w-8 mb-2 opacity-20" />
                       No active GPS signals found.
                     </div>
                   )}
                </div>
              </div>
              <div className="flex-1 md:h-full h-2/3 relative bg-slate-900 overflow-hidden">
                 {selectedEmployee ? (
                    <LocationMap lat={selectedEmployee.location.lat} lng={selectedEmployee.location.lng} className="z-0" />
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-950">
                       <MapPin className="h-16 w-16 mb-4 opacity-20"/>
                       <p>Select an active employee to pinpoint their location</p>
                    </div>
                 )}
                 {selectedEmployee && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl p-4 flex items-start gap-4 z-10">
                       <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                         <Navigation className="h-5 w-5 text-primary" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{selectedEmployee.user.name}'s Last Known Fix</span>
                          <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            GPS captured at {format(new Date(selectedEmployee.timestamp), 'h:mm a')}
                          </span>
                       </div>
                    </div>
                 )}
              </div>
           </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}