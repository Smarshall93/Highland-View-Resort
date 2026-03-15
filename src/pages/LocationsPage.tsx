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
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  useEffect(() => {
    if (currentUserId && isManagerOrAdmin) {
      syncData(currentUserId, currentUserRole);
    }
  }, [currentUserId, currentUserRole, syncData, isManagerOrAdmin]);
  if (!isManagerOrAdmin) {
    return <Navigate to="/" replace />;
  }
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const payload = { name: newName, description: newDesc };
      const created = await api<WorkLocation>('/api/locations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      addLocationLocal(created);
      toast.success('Location added successfully');
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create location');
    } finally {
      setIsCreating(false);
    }
  };
  const handleOpenEdit = (loc: WorkLocation) => {
    setEditLoc(loc);
    setEditName(loc.name);
    setEditDesc(loc.description || '');
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
      toast.success('Location updated successfully');
      setEditLoc(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update location');
      syncData(currentUserId, currentUserRole);
    } finally {
      setIsEditing(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this location? It may affect existing tasks and forms.")) return;
    try {
      deleteLocationLocal(id);
      await api(`/api/locations/${id}`, { method: 'DELETE' });
      toast.success('Location deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete location');
      syncData(currentUserId, currentUserRole);
    }
  };
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MapPin className="h-8 w-8 text-primary" />
              Facility Locations
            </h1>
            <p className="text-muted-foreground mt-1">Manage physical locations for tasks and QR form routing.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="shadow-sm hover:shadow-md transition-all">
            <Plus className="mr-2 h-4 w-4" /> Add Location
          </Button>
        </div>
        {locations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="group hover:shadow-md transition-shadow relative overflow-hidden">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Added {format(new Date(loc.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-2 -mt-2">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(loc)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(loc.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Location
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                    {loc.description || <span className="italic opacity-50">No description provided.</span>}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/10">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No locations found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm mx-auto">
              Add your first physical location to start organizing tasks and QR codes by area.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              Add your first location
            </Button>
          </div>
        )}
        {/* Create Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogDescription>
                  Define a physical area within your facility.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="e.g. Pool Area, Room 101, Main Lobby"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description (Optional)</Label>
                  <Input
                    id="desc"
                    placeholder="Brief details about this location"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newName.trim()}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Location
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* Edit Modal */}
        <Dialog open={!!editLoc} onOpenChange={(open) => !open && setEditLoc(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Edit Location</DialogTitle>
                <DialogDescription>
                  Update the details for this area.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Location Name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description (Optional)</Label>
                  <Input
                    id="edit-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditLoc(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditing || !editName.trim()}>
                  {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}