import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
// Haversine formula for distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
export function useGeofence() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const lastReminders = useRef<Record<string, number>>({});
  useEffect(() => {
    // Only track if user is an employee with assigned sites
    if (!user || user.role !== 'employee' || !user.assignedWorkSiteIds || user.assignedWorkSiteIds.length === 0) return;
    if (user.disableGeofenceReminders) return;
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const { workSites, timeEntries } = useDataStore.getState();
      // Check current clock status
      const userEntries = timeEntries.filter(e => e.userId === user.id).sort((a, b) => b.timestamp - a.timestamp);
      const isWorking = userEntries[0]?.type === 'clock_in' || userEntries[0]?.type === 'break_end';
      if (isWorking) return; // Already clocked in, no reminder needed
      // Check against assigned sites
      user.assignedWorkSiteIds.forEach(siteId => {
        const site = workSites.find(s => s.id === siteId);
        if (site) {
          const distance = getDistance(latitude, longitude, site.lat, site.lng);
          if (distance <= site.radius) {
            const now = Date.now();
            const lastSent = lastReminders.current[site.id] || 0;
            // Throttle reminders to once every 2 hours per site
            if (now - lastSent > 2 * 60 * 60 * 1000) {
              lastReminders.current[site.id] = now;
              toast.info('Geofence Reminder', {
                description: `You have entered ${site.name}. Please clock in.`,
                duration: 10000,
                action: {
                  label: 'Clock In',
                  onClick: () => navigate('/time-clock?auto=clock_in')
                }
              });
            }
          }
        }
      });
    }, (err) => {
      console.info('Geofence watch error:', err);
    }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, navigate]);
}