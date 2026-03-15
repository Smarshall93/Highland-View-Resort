import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";
import { useGeofence } from "@/hooks/useGeofence";
import { useDataStore } from "@/store/dataStore";
import { Cloud, CheckCircle2, Loader2, CloudOff, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
type AppLayoutProps = {
  children: React.ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
};
export function AppLayout({ children, container = true, className = "", contentClassName = "" }: AppLayoutProps): JSX.Element {
  const userId = useAuthStore(s => s.user?.id);
  const userRole = useAuthStore(s => s.user?.role);
  const location = useLocation();
  const isSyncing = useDataStore(s => s.isSyncing);
  const lastSynced = useDataStore(s => s.lastSynced);
  const cloudSyncEnabled = useDataStore(s => s.cloudSyncEnabled);
  // Validate session expiration on initial mount and set up aggressive 1-minute sync.
  useEffect(() => {
    useAuthStore.getState().checkSession();
    let intervalId: ReturnType<typeof setInterval>;
    // Trigger local-first data sync in background
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      useDataStore.getState().syncData(currentUser.id, currentUser.role).then(() => {
        useDataStore.getState().triggerDailyTasksSync();
      });
      // Aggressive live sync every 60 seconds for near real-time updates and frequent cloud backups
      intervalId = setInterval(() => {
        if (useAuthStore.getState().checkSession()) {
           useDataStore.getState().syncData(currentUser.id, currentUser.role, true);
        }
      }, 60000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
  // Initialize live notifications hook for managers/admins
  useLiveNotifications();
  // Initialize global geofencing reminders for employees
  useGeofence();
  if (!userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className={`flex flex-col min-h-screen bg-background/95 ${className}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger className="shrink-0" />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <TooltipProvider>
              {!cloudSyncEnabled ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 px-2.5 py-1.5 rounded-full border border-slate-500/20 shadow-sm cursor-help uppercase tracking-tight">
                      <CloudOff className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Standalone (Free)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        Cloud backup is disabled. Your data is currently stored only in this browser (Free Tier). 
                        Multi-device sync is unavailable in this mode.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : isSyncing ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-full border border-amber-500/20 shadow-sm transition-all duration-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Syncing to Cloud...</span>
                </div>
              ) : lastSynced > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20 shadow-sm transition-all duration-300 cursor-help" title={`Last synced: ${new Date(lastSynced).toLocaleTimeString()}`}>
                      <Cloud className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Cloud Synced</span>
                      <CheckCircle2 className="h-3 w-3 hidden sm:inline" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Secure cloud backup active. Last synced at {new Date(lastSynced).toLocaleTimeString()}.</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </TooltipProvider>
            <ThemeToggle className="relative top-0 right-0" />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {container ? (
            <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 ${contentClassName}`}>
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}