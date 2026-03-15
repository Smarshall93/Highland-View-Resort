import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import type { TimeEntry, Task } from '@shared/types';
export function useLiveNotifications() {
  const userId = useAuthStore(s => s.user?.id);
  const userRole = useAuthStore(s => s.user?.role);
  const seenTimeEntries = useRef<Set<string>>(new Set());
  const seenCompletedTasks = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);
  const consecutiveFailures = useRef(0);
  useEffect(() => {
    if (!userId || !userRole) {
      return;
    }
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!isMounted) return;
      // Resource saving: only poll if tab is active
      if (document.visibilityState !== 'visible') {
        timeoutId = setTimeout(poll, 30000);
        return;
      }
      try {
        const timestamp = Date.now();
        const controller = new AbortController();
        const signal = controller.signal;
        // Add timeout to fetch
        const fetchTimeout = setTimeout(() => controller.abort(), 10000);
        const [timeRes, taskRes] = await Promise.all([
          api<{items: TimeEntry[]}>(`/api/time-entries?limit=10&_t=${timestamp}`, { signal }),
          api<{items: Task[]}>(`/api/tasks?limit=10&_t=${timestamp}`, { signal })
        ]);
        clearTimeout(fetchTimeout);
        consecutiveFailures.current = 0;
        const timeEntries = timeRes.items || [];
        const tasks = taskRes.items || [];
        if (isFirstRun.current) {
          timeEntries.forEach(t => seenTimeEntries.current.add(t.id));
          tasks.forEach(t => {
            if (t.status === 'completed') {
              seenCompletedTasks.current.add(t.id);
            }
          });
          isFirstRun.current = false;
          timeoutId = setTimeout(poll, 15000);
          return;
        }
        let hasNewData = false;
        // Notifications logic
        timeEntries.forEach(entry => {
          if (!seenTimeEntries.current.has(entry.id)) {
            seenTimeEntries.current.add(entry.id);
            hasNewData = true;
            if (userRole === 'admin' || userRole === 'manager') {
              const action = entry.type === 'clock_in' ? 'clocked in' :
                             entry.type === 'clock_out' ? 'clocked out' :
                             entry.type === 'break_start' ? 'started a break' : 'ended a break';
              toast.info(`Team Update`, { description: `Activity detected: User ${entry.userId.substring(0, 4)} ${action}.` });
            }
          }
        });
        tasks.forEach(task => {
          if (task.status === 'completed' && !seenCompletedTasks.current.has(task.id)) {
             seenCompletedTasks.current.add(task.id);
             hasNewData = true;
             if (userRole === 'admin' || userRole === 'manager') {
               toast.success(`Duty Completed`, { description: `"${task.title}" was resolved.` });
             }
          }
        });
        if (hasNewData) {
          useDataStore.getState().syncData(userId, userRole, true);
        }
        timeoutId = setTimeout(poll, 15000);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('[POLL] Request timed out');
        } else if (err.message?.includes('500') || err.message?.includes('failed to load')) {
          console.error('[POLL] Backend service failure: Worker routes failed to respond');
        } else {
          console.error('[POLL] Unexpected error:', err.message);
        }
        consecutiveFailures.current++;
        const backoff = Math.min(60000, 15000 * consecutiveFailures.current);
        timeoutId = setTimeout(poll, backoff);
      }
    };
    poll();
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [userId, userRole]);
}