import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api-client';
import type { WorkLocation } from '@shared/types';
import { format } from 'date-fns';
export function LocationsPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const locations = useDataStore(s => s.locations);
  const addLocationLocal = useDataStore(s => s.addLocationLocal);
  const updateLocationLocal = useDataStore(s => s.updateLocationLocal);
  const deleteLocationLocal = useDataStore(s => s.deleteLocationLocal);
  const syncData = useDataStore(s => s.syncData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editLoc, setEditLoc] = useState<WorkLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const isOwner = currentUserRole === 'owner';
  const canMutate = currentUserRole === 'admin' || currentUserRole === 'manager';
  useEffect(() => {
    if (currentUserId && (canMutate || isOwner)) {
      syncData(currentUserId, currentUserRole);
    }
  }, [currentUserId, currentUserRole, syncData, canMutate, isOwner]);
  if (!canMutate && !isOwner) return <Navigate to="/" replace />;
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOwner) return;
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const created = await api<WorkLocation>('/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: newName, description: newDesc })
      });
      addLocationLocal(created);
      toast.success('Location added');
      setIsModalOpen(false);
      setNewName(''); setNewDesc('');
    } catch (err) {
      toast.error('Failed to create');
    } finally {
      setIsCreating(false);
    }
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLoc || !editName.trim()) return;
    setIsEditing(true);
    try {
      const updates = { name: editName, description: editDesc };
      updateLocationLocal(editLoc.id, updates);
      await api<WorkLocation>(`/api/locations/${editLoc.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      toast.success('Updated');
      setEditLoc(null);
    } catch (err) {
      toast.error('Failed');
    } finally {
      setIsEditing(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (isOwner) return;
    if (!window.confirm("Delete this location?")) return;
    try {
      deleteLocationLocal(id);
      await api(`/api/locations/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed');
    }
  };
  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><MapPin className="h-8 w-8 text-primary" />Facility Locations</h1>
            <p className="text-muted-foreground">Manage physical areas for resort operations.</p>
          </div>
          {canMutate && (
            <Button onClick={() => setIsModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Location</Button>
          )}
        </div>
        {locations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="group">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><MapPin className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-semibold">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground">Added {format(new Date(loc.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    {canMutate && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditLoc(loc); setEditName(loc.name); setEditDesc(loc.description || ''); }}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(loc.id)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{loc.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/10">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>No locations found.</p>
            {canMutate && <Button onClick={() => setIsModalOpen(true)} className="mt-4">Add Location</Button>}
          </div>
        )}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader><DialogTitle>Add New Location</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
              </div>
              <DialogFooter><Button type="submit" disabled={isCreating}>Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={!!editLoc} onOpenChange={(open) => !open && setEditLoc(null)}>
          <DialogContent>
            <form onSubmit={handleSaveEdit}>
              <DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label>Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
              </div>
              <DialogFooter><Button type="submit" disabled={isEditing}>Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}