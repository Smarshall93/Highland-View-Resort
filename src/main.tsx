import '@/lib/errorReporter';
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args[0]?.message || args[0];
    if (typeof msg === 'string' && (
        msg.includes('[Vite] WebSocket connection to') ||
        msg.toLowerCase().includes('[vite] failed to connect to websocket')
    )) return;
    originalError.apply(console, args);
  };
}
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css';
import { HomePage } from '@/pages/HomePage';
import { TimeClockPage } from '@/pages/TimeClockPage';
import { TasksPage } from '@/pages/TasksPage';
import { QRFormsPage } from '@/pages/QRFormsPage';
import { PublicFormPage } from '@/pages/PublicFormPage';
import { TeamDirectoryPage } from '@/pages/TeamDirectoryPage';
import { LoginPage } from '@/pages/LoginPage';
import { KioskModePage } from '@/pages/KioskModePage';
import { HelpPage } from '@/pages/HelpPage';
import { DebugPage } from '@/pages/DebugPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LocationsPage } from '@/pages/LocationsPage';
import { MapPage } from '@/pages/MapPage';
import { WorkSitesPage } from '@/pages/WorkSitesPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { ChatPage } from '@/pages/ChatPage';
import { QRPrintStationPage } from '@/pages/QRPrintStationPage';
const queryClient = new QueryClient();
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/", element: <HomePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/schedule", element: <SchedulePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/chat", element: <ChatPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/qr-print", element: <QRPrintStationPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/time-clock", element: <TimeClockPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/tasks", element: <TasksPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/qr-forms", element: <QRFormsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/f/:id", element: <PublicFormPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/users", element: <TeamDirectoryPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/locations", element: <LocationsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/work-sites", element: <WorkSitesPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/map", element: <MapPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/kiosk", element: <KioskModePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/help", element: <HelpPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/debug", element: <DebugPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/reports", element: <ReportsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/profile", element: <ProfilePage />, errorElement: <RouteErrorBoundary /> }
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);