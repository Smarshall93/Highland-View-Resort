import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, UserPlus, MoreVertical, Briefcase, Loader2, Mail, ShieldAlert, Edit, Trash2, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { User, UserRole, ShiftRole } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { EditProfileModal } from '@/components/EditProfileModal';
export function TeamDirectoryPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const users = useDataStore(s => s.users);
  const syncData = useDataStore(s => s.syncData);
  const [isLoading, setIsLoading] = useState(true);
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newPin, setNewPin] = useState('');
  const [newShiftRoles, setNewShiftRoles] = useState<ShiftRole[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  useEffect(() => {
    const loadData = async () => {
      if (currentUserRole === 'employee') return;
      setIsLoading(true);
      await syncData(currentUserId, currentUserRole);
      setIsLoading(false);
    };
    loadData();
  }, [currentUserId, currentUserRole, syncData]);
  if (currentUserRole === 'employee') {
    return <Navigate to="/" replace />;
  }
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setIsCreating(true);
    try {
      await api<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          pinCode: newPin || undefined,
          shiftRoles: newShiftRoles
        })
      });
      toast.success('Team member added successfully.');
      setIsModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('employee');
      setNewPin('');
      setNewShiftRoles([]);
      await syncData(currentUserId, currentUserRole, true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add team member');
    } finally {
      setIsCreating(false);
    }
  };
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-200 dark:border-rose-800">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200 dark:border-blue-800">Manager</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Employee</Badge>;
    }
  };
  const getInitials = (name: string) => {
    const initials = (name || '').trim().split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return initials || 'U';
  };
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Team Directory
            </h1>
            <p className="text-muted-foreground mt-1">Manage your workforce, assign roles, and provision access.</p>
          </div>
          {isManagerOrAdmin && (
            <Button onClick={() => setIsModalOpen(true)} className="shadow-sm hover:shadow-md transition-all">
              <UserPlus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          )}
        </div>
        {isLoading && users.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="overflow-hidden shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2 w-full flex flex-col items-center">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : users.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((user) => (
              <Card key={user.id} className="group hover:shadow-md transition-all overflow-hidden flex flex-col relative">
                <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col items-center text-center relative">
                  <div className="h-20 w-20 rounded-full border-4 border-background bg-secondary flex items-center justify-center -mt-10 mb-3 overflow-hidden shadow-sm">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold text-muted-foreground">{getInitials(user.name)}</span>
                    )}
                  </div>
                  {isManagerOrAdmin && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-muted/50">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setEditingUser(user)} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <h3 className="text-lg font-bold line-clamp-1 w-full">{user.name}</h3>
                  <div className="mt-1 mb-4">{getRoleBadge(user.role)}</div>
                  <div className="w-full space-y-3 mt-auto pt-4 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 py-1.5 px-2 rounded-md truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user.email || 'No email set'}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground justify-center gap-2">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>ID: {user.id.split('-')[0]}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/10">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No team members</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Start building your team by adding your first employee.
            </p>
            {isManagerOrAdmin && (
              <Button onClick={() => setIsModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Team Member
              </Button>
            )}
          </div>
        )}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create a new employee profile and provision access credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="e.g. Jane Smith"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-rose-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane.smith@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password <span className="text-rose-500">*</span></Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="e.g. securePass123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <ShieldAlert className="h-3 w-3" /> User will use this to sign into the mobile app.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">System Role <span className="text-rose-500">*</span></Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => setNewRole(v)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 border-t pt-4 mt-2">
                  <Label htmlFor="pinCode">4-Digit PIN Code (Optional)</Label>
                  <Input
                    id="pinCode"
                    type="text"
                    maxLength={4}
                    pattern="[0-9]*"
                    placeholder="e.g. 1234"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Used for shared tablet clock-ins via Kiosk Mode.
                  </p>
                </div>
                <div className="space-y-3 border-t pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <Label>Shift Roles & Pay Rates</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewShiftRoles([...newShiftRoles, { id: crypto.randomUUID(), title: '' }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Role
                    </Button>
                  </div>
                  {newShiftRoles.map((role, idx) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Role Title"
                        value={role.title}
                        onChange={e => {
                          const newRoles = [...newShiftRoles];
                          newRoles[idx].title = e.target.value;
                          setNewShiftRoles(newRoles);
                        }}
                        className="flex-1"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          placeholder="Rate"
                          className="pl-6"
                          value={role.payRate || ''}
                          onChange={e => {
                            const newRoles = [...newShiftRoles];
                            newRoles[idx].payRate = parseFloat(e.target.value) || undefined;
                            setNewShiftRoles(newRoles);
                          }}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setNewShiftRoles(newShiftRoles.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="mt-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newName.trim() || !newEmail.trim() || !newPassword.trim()}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Profile
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <EditProfileModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          userToEdit={editingUser}
        />
      </div>
    </AppLayout>
  );
}