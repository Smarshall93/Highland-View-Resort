import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Clock, CheckSquare, QrCode, Settings, Users, LogOut, 
  HelpCircle, FileText, UserCircle, MapPin, Map as MapIcon, Mountain, 
  Calendar, MessageSquare, Printer 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/authStore";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const userName = useAuthStore(s => s.user?.name);
  const userRole = useAuthStore(s => s.user?.role);
  const userAvatarUrl = useAuthStore(s => s.user?.avatarUrl);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  return (
    <Sidebar>
      <SidebarHeader className="py-4">
        <div className="flex items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden shrink-0 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <Mountain className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase font-bookman">Highland View</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard">
                <Link to="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/schedule")} tooltip="Work Schedule">
                <Link to="/schedule">
                  <Calendar />
                  <span>Work Schedule</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/chat")} tooltip="Team Chat">
                <Link to="/chat">
                  <MessageSquare />
                  <span>Team Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/time-clock")} tooltip="Time Clock">
                <Link to="/time-clock">
                  <Clock />
                  <span>Time Clock</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/tasks")} tooltip="Tasks & Routines">
                <Link to="/tasks">
                  <CheckSquare />
                  <span>Tasks & Routines</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isManagerOrAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/qr-forms")} tooltip="Form Builder">
                    <Link to="/qr-forms">
                      <QrCode />
                      <span>Form Builder</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/qr-print")} tooltip="QR Print Station">
                    <Link to="/qr-print">
                      <Printer />
                      <span>QR Print Station</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/reports")} tooltip="Analytics">
                    <Link to="/reports">
                      <FileText />
                      <span>Analytics & Payroll</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Facility</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/map")} tooltip="Resort Map">
                <Link to="/map">
                  <MapIcon />
                  <span>Interactive Map</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isManagerOrAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/work-sites")} tooltip="Work Sites">
                    <Link to="/work-sites">
                      <MapPin />
                      <span>Geofenced Sites</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/users")} tooltip="Team Directory">
                    <Link to="/users">
                      <Users />
                      <span>Team Directory</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Link to="/profile" className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm mb-2 hover:bg-muted/50 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary overflow-hidden shrink-0">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={userName || 'User'} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold">{getInitials(userName)}</span>
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-bold leading-none truncate">{userName || 'User'}</span>
            <span className="text-[10px] text-muted-foreground mt-1 capitalize truncate font-semibold">{userRole || 'employee'}</span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}