import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api-client';
import type { Task, TimeEntry, User, WorkLocation, QRForm, WorkSite, Shift, ChatMessage, Chat } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
interface DataState {
  tasks: Task[];
  timeEntries: TimeEntry[];
  users: User[];
  locations: WorkLocation[];
  qrForms: QRForm[];
  workSites: WorkSite[];
  shifts: Shift[];
  messages: ChatMessage[];
  lastSynced: number;
  lastDailySync: number;
  isSyncing: boolean;
  syncCount: number;
  cloudSyncEnabled: boolean;
  setCloudSyncEnabled: (enabled: boolean) => void;
  syncData: (userId?: string, role?: string, force?: boolean) => Promise<void>;
  triggerDailyTasksSync: () => Promise<void>;
  addTaskLocal: (task: Task) => void;
  updateTaskLocal: (id: string, updates: Partial<Task>) => void;
  deleteTaskLocal: (id: string) => void;
  addTimeEntryLocal: (entry: TimeEntry) => void;
  updateTimeEntryLocal: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntryLocal: (id: string) => void;
  updateUserLocal: (id: string, updates: Partial<User>) => void;
  addLocationLocal: (loc: WorkLocation) => void;
  updateLocationLocal: (id: string, updates: Partial<WorkLocation>) => void;
  deleteLocationLocal: (id: string) => void;
  addWorkSiteLocal: (site: WorkSite) => void;
  updateWorkSiteLocal: (id: string, updates: Partial<WorkSite>) => void;
  deleteWorkSiteLocal: (id: string) => void;
  addShiftLocal: (shift: Shift) => void;
  updateShiftLocal: (id: string, updates: Partial<Shift>) => void;
  deleteShiftLocal: (id: string) => void;
  addMessageLocal: (msg: ChatMessage) => void;
  clearLocalData: () => void;
}
const activeSyncPromises = new Map<string, Promise<void>>();
const lastRequestIds = new Map<string, number>();
export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      tasks: [],
      timeEntries: [],
      users: [],
      locations: [],
      qrForms: [],
      workSites: [],
      shifts: [],
      messages: [],
      lastSynced: 0,
      lastDailySync: 0,
      isSyncing: false,
      syncCount: 0,
      cloudSyncEnabled: true,
      setCloudSyncEnabled: (enabled) => set({ cloudSyncEnabled: enabled }),
      syncData: async (userId?: string, role?: string, force?: boolean) => {
        if (!get().cloudSyncEnabled) return Promise.resolve();
        const syncKey = `${userId || 'anon'}-${role || 'none'}`;
        if (!force && activeSyncPromises.has(syncKey)) return activeSyncPromises.get(syncKey);
        const requestId = (lastRequestIds.get(syncKey) || 0) + 1;
        lastRequestIds.set(syncKey, requestId);
        const promise = (async () => {
          set((state) => ({ syncCount: state.syncCount + 1, isSyncing: true }));
          try {
            const cb = `_cb=${Date.now()}`;
            let tasksUrl = `/api/tasks?limit=1000&${cb}`;
            let timeUrl = `/api/time-entries?limit=1000&${cb}`;
            let shiftsUrl = `/api/shifts?${cb}`;
            if (role === 'employee' && userId) {
              tasksUrl += `&assignee=${userId}`;
              timeUrl += `&userId=${userId}`;
              shiftsUrl += `&userId=${userId}`;
            }
            const [tasksRes, timeRes, usersRes, locsRes, qrRes, sitesRes, shiftsRes, chatRes] = await Promise.all([
              api<{items: Task[]}>(tasksUrl),
              api<{items: TimeEntry[]}>(timeUrl),
              api<{items: User[]}>('/api/users?limit=100'),
              api<{items: WorkLocation[]}>('/api/locations?limit=100'),
              api<{items: QRForm[]}>('/api/qr-forms?limit=100'),
              api<{items: WorkSite[]}>('/api/work-sites?limit=100'),
              api<{items: Shift[]}>(shiftsUrl),
              api<Chat & { messages: ChatMessage[] }>('/api/chats')
            ]);
            if (requestId === lastRequestIds.get(syncKey)) {
              set({
                tasks: tasksRes.items || [],
                timeEntries: timeRes.items || [],
                users: usersRes.items || [],
                locations: locsRes.items || [],
                qrForms: qrRes.items || [],
                workSites: sitesRes.items || [],
                shifts: shiftsRes.items || [],
                messages: chatRes.messages || [],
                lastSynced: Date.now()
              });
            }
          } catch (err) {
            console.error('Data Sync Error:', err);
          } finally {
            activeSyncPromises.delete(syncKey);
            set((state) => {
              const newCount = Math.max(0, state.syncCount - 1);
              return { syncCount: newCount, isSyncing: newCount > 0 };
            });
          }
        })();
        activeSyncPromises.set(syncKey, promise);
        return promise;
      },
      triggerDailyTasksSync: async () => {
        if (!get().cloudSyncEnabled) return;
        const now = Date.now();
        if (now - get().lastDailySync > 12 * 60 * 60 * 1000) {
          try {
            await api('/api/tasks/daily-sync', { method: 'POST' });
            set({ lastDailySync: now });
            await get().syncData(undefined, undefined, true);
          } catch (err) { console.error(err); }
        }
      },
      addTaskLocal: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
      updateTaskLocal: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTaskLocal: (id) => set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),
      addTimeEntryLocal: (entry) => set((state) => ({ timeEntries: [entry, ...state.timeEntries] })),
      updateTimeEntryLocal: (id, updates) => set((state) => ({
        timeEntries: state.timeEntries.map(e => e.id === id ? { ...e, ...updates } : e)
      })),
      deleteTimeEntryLocal: (id) => set((state) => ({ timeEntries: state.timeEntries.filter(e => e.id !== id) })),
      updateUserLocal: (id, updates) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
      })),
      addLocationLocal: (loc) => set((state) => ({ locations: [loc, ...state.locations] })),
      updateLocationLocal: (id, updates) => set((state) => ({
        locations: state.locations.map(l => l.id === id ? { ...l, ...updates } : l)
      })),
      deleteLocationLocal: (id) => set((state) => ({ locations: state.locations.filter(l => l.id !== id) })),
      addWorkSiteLocal: (site) => set((state) => ({ workSites: [site, ...state.workSites] })),
      updateWorkSiteLocal: (id, updates) => set((state) => ({
        workSites: state.workSites.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      deleteWorkSiteLocal: (id) => set((state) => ({ workSites: state.workSites.filter(s => s.id !== id) })),
      addShiftLocal: (shift) => set((state) => ({ shifts: [shift, ...state.shifts] })),
      updateShiftLocal: (id, updates) => set((state) => ({
        shifts: state.shifts.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      deleteShiftLocal: (id) => set((state) => ({ shifts: state.shifts.filter(s => s.id !== id) })),
      addMessageLocal: (msg) => set((state) => ({ messages: [...state.messages, msg].slice(-200) })),
      clearLocalData: () => set({ tasks: [], timeEntries: [], users: [], locations: [], qrForms: [], workSites: [], shifts: [], messages: [], lastSynced: 0, lastDailySync: 0, isSyncing: false, syncCount: 0 })
    }),
    {
      name: 'synqwork-data-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => {
        const { isSyncing, syncCount, ...rest } = state;
        return rest;
      }
    }
  )
);