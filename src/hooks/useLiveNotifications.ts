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
  useEffect(() => {
    if (!userId || !userRole) {
      return;
    }
    let isMounted = true;
    const poll = async () => {
      if (!isMounted) return;
      try {
        const timestamp = Date.now();
        const [timeRes, taskRes] = await Promise.all([
          api<{items: TimeEntry[]}>(`/api/time-entries?limit=10&_t=${timestamp}`),
          api<{items: Task[]}>(`/api/tasks?limit=10&_t=${timestamp}`)
        ]);
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
          return;
        }
        let hasNewData = false;
        timeEntries.forEach(entry => {
          if (!seenTimeEntries.current.has(entry.id)) {
            seenTimeEntries.current.add(entry.id);
            hasNewData = true;
            const action = entry.type === 'clock_in' ? 'clocked in' :
                           entry.type === 'clock_out' ? 'clocked out' :
                           entry.type === 'break_start' ? 'started a break' : 'ended a break';
            // Extract a short identifier for the user
            const shortId = entry.userId.length > 8 ? entry.userId.substring(0, 4) : entry.userId;
            if (userRole === 'admin' || userRole === 'manager') {
              toast.info(`Team Update`, {
                description: `User ${shortId} just ${action}.`
              });
            }
          }
        });
        tasks.forEach(task => {
          if (task.status === 'completed' && !seenCompletedTasks.current.has(task.id)) {
             seenCompletedTasks.current.add(task.id);
             hasNewData = true;
             if (userRole === 'admin' || userRole === 'manager') {
               toast.success(`Task Completed`, {
                 description: `"${task.title}" was just marked as complete.`
               });
             }
          }
        });
        // Trigger global state update so dashboards and timesheets reflect new data instantly
        if (hasNewData) {
          useDataStore.getState().syncData(userId, userRole, true);
        }
      } catch (err: any) {
        console.error('Live notifications polling error:', err?.message || String(err));
      }
    };
    poll(); // Initial check
    const intervalId = setInterval(poll, 15000); // Poll every 15 seconds
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [userId, userRole]);
}