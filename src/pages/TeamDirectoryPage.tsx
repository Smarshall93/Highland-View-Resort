import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, UserPlus, MoreVertical, Briefcase, Loader2, Mail, ShieldAlert, Edit, Plus, Trash2, Shield, CheckCircle2 } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newPin, setNewPin] = useState('');
  const [newShiftRoles, setNewShiftRoles] = useState<ShiftRole[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const isOwner = currentUserRole === 'owner';
  const canMutate = (currentUserRole === 'admin' || currentUserRole === 'manager') && !isOwner;
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
    if (!canMutate) {
      toast.error("Read-Only Access", { description: "Owners cannot provision team members." });
      return;
    }
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
      toast.success('Member added to resort directory');
      setIsModalOpen(false);
      resetForm();
      await syncData(currentUserId, currentUserRole, true);
    } catch (error: any) {
      toast.error('Failed to add member');
    } finally {
      setIsCreating(false);
    }
  };
  const resetForm = () => {
    setNewName(''); setNewEmail(''); setNewPassword('');
    setNewRole('employee'); setNewPin(''); setNewShiftRoles([]);
  };
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin': return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 uppercase font-black text-[10px]">Admin</Badge>;
      case 'manager': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 uppercase font-black text-[10px]">Manager</Badge>;
      case 'owner': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 uppercase font-black text-[10px]">Owner</Badge>;
      default: return <Badge variant="secondary" className="uppercase font-black text-[10px]">Employee</Badge>;
    }
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-2">
              <Users className="h-10 w-10 text-primary" />
              Team Directory
            </h1>
            <p className="text-muted-foreground font-medium">Manage permissions and resort staff profiles.</p>
          </div>
          {canMutate && (
            <Button size="lg" onClick={() => setIsModalOpen(true)} className="h-14 px-8 rounded-2xl shadow-xl hover:scale-105 transition-all">
              <UserPlus className="mr-2 h-5 w-5" /> Add Team Member
            </Button>
          )}
        </div>
        {isOwner && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-4 rounded-2xl flex items-start gap-4">
            <Shield className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
               <p className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1">Administrative Access Level: Monitor</p>
               <p className="text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed font-medium">
                 You are viewing the resort directory in high-security monitor mode. Provisioning new members or modifying account credentials is restricted to Admin or Manager roles.
               </p>
            </div>
          </div>
        )}
        {isLoading && users.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((user) => (
              <Card key={user.id} className="group hover:shadow-2xl transition-all border-none shadow-sm rounded-[2rem] overflow-hidden bg-card">
                <CardContent className="p-8 flex flex-col items-center text-center relative">
                  <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center mb-4 border-4 border-background shadow-lg overflow-hidden group-hover:scale-105 transition-transform">
                    {user.avatarUrl ? <img src={user.avatarUrl} className="h-full w-full object-cover"/> : <span className="font-black text-2xl text-muted-foreground">{user.name.substring(0, 2).toUpperCase()}</span>}
                  </div>
                  {canMutate && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 bg-background/80 backdrop-blur rounded-full"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => setEditingUser(user)} className="font-bold gap-2"><Edit className="h-4 w-4" /> Edit Profile</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <h3 className="font-black text-xl tracking-tight mb-1">{user.name}</h3>
                  <div className="mb-6">{getRoleBadge(user.role)}</div>
                  <div className="w-full space-y-3 pt-6 border-t border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="flex items-center justify-center gap-2">
                       <Mail className="h-3 w-3" />
                       <span className="truncate max-w-[150px]">{user.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                       <Briefcase className="h-3 w-3" />
                       <span>ID: {user.id.split('-')[0]}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem]">
            <form onSubmit={handleCreateUser}>
              <DialogHeader className="p-8 border-b bg-muted/30">
                <DialogTitle className="text-2xl font-black">Provision Member</DialogTitle>
                <DialogDescription className="font-medium">Assign a new member to the resort workforce.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest">Full Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest">Email</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest">Initial Password</Label>
                  <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest">Resort Role</Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => setNewRole(v)}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="p-8 bg-muted/20 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12">Cancel</Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl h-12 px-8 font-black shadow-lg">
                  {isCreating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Deploy Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <EditProfileModal isOpen={!!editingUser} onClose={() => setEditingUser(null)} userToEdit={editingUser} />
      </div>
    </AppLayout>
  );
}