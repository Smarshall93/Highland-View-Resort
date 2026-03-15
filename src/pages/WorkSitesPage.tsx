import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Map, Plus, Edit, Trash2, MapPin, Loader2, Navigation } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { WorkSite } from '@shared/types';
export function WorkSitesPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const workSites = useDataStore(s => s.workSites);
  const users = useDataStore(s => s.users);
  const syncData = useDataStore(s => s.syncData);
  const addWorkSiteLocal = useDataStore(s => s.addWorkSiteLocal);
  const updateWorkSiteLocal = useDataStore(s => s.updateWorkSiteLocal);
  const deleteWorkSiteLocal = useDataStore(s => s.deleteWorkSiteLocal);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);
  // Form State
  const [siteCode, setSiteCode] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [radius, setRadius] = useState<number | ''>(100);
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  useEffect(() => {
    if (currentUserId && isManagerOrAdmin) {
      syncData(currentUserId, currentUserRole);
    }
  }, [currentUserId, currentUserRole, syncData, isManagerOrAdmin]);
  if (!isManagerOrAdmin) return <Navigate to="/" replace />;
  const resetForm = () => {
    setSiteCode('');
    setName('');
    setLat('');
    setLng('');
    setRadius(100);
    setEditingSite(null);
  };
  const handleOpenEdit = (site: WorkSite) => {
    setEditingSite(site);
    setSiteCode(site.siteCode);
    setName(site.name);
    setLat(site.lat);
    setLng(site.lng);
    setRadius(site.radius);
    setIsModalOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !siteCode || lat === '' || lng === '' || radius === '') return;
    setIsCreating(true);
    try {
      const payload = {
        siteCode,
        name,
        lat: Number(lat),
        lng: Number(lng),
        radius: Number(radius)
      };
      if (editingSite) {
        const updated = await api<WorkSite>(`/api/work-sites/${editingSite.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        updateWorkSiteLocal(editingSite.id, updated);
        toast.success('Work Site updated');
      } else {
        const created = await api<WorkSite>('/api/work-sites', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        addWorkSiteLocal(created);
        toast.success('Work Site created');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save Work Site');
    } finally {
      setIsCreating(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this Work Site? This will not remove existing assignments but will stop geofenced reminders for it.")) return;
    try {
      deleteWorkSiteLocal(id);
      await api(`/api/work-sites/${id}`, { method: 'DELETE' });
      toast.success('Work Site deleted');
    } catch (err: any) {
      toast.error('Failed to delete');
      syncData(currentUserId, currentUserRole);
    }
  };
  const getAssignedCount = (siteId: string) => {
    return users.filter(u => u.assignedWorkSiteIds?.includes(siteId)).length;
  };
  const captureCurrentLocation = () => {
    if ('geolocation' in navigator) {
      toast.info("Capturing location...");
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast.success("Location captured");
      }, () => {
        toast.error("Failed to get location");
      });
    } else {
      toast.error("Geolocation not supported");
    }
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Map className="h-8 w-8 text-primary" />
                Work Sites
              </h1>
              <p className="text-muted-foreground mt-1">Manage physical locations and geofences for employee clock-ins.</p>
            </div>
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="shadow-sm hover:shadow-md transition-all">
              <Plus className="mr-2 h-4 w-4" /> Add Work Site
            </Button>
          </div>
          {workSites.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workSites.map(site => (
                <Card key={site.id} className="group hover:shadow-md transition-all border-t-4 border-t-primary overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold line-clamp-1">{site.name}</h3>
                        <p className="text-xs font-mono text-muted-foreground uppercase bg-muted/50 w-fit px-2 py-0.5 rounded mt-1">Code: {site.siteCode}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(site)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(site.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>Radius: <strong className="text-foreground">{site.radius}m</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                        <span className="text-xs break-all font-mono">{site.lat.toFixed(6)}, {site.lng.toFixed(6)}</span>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Assigned Employees:</span>
                      <span className="font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">{getAssignedCount(site.id)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/10">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No Work Sites Defined</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm mx-auto">
                Create your first work site to enable geofenced clock-in reminders for your team.
              </p>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
                Create Work Site
              </Button>
            </div>
          )}
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingSite ? 'Edit Work Site' : 'Add Work Site'}</DialogTitle>
              <DialogDescription>Define the geofence parameters for this location.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Site Name <span className="text-rose-500">*</span></Label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Downtown Office" />
              </div>
              <div className="space-y-2">
                <Label>Site Code <span className="text-rose-500">*</span></Label>
                <Input required value={siteCode} onChange={e => setSiteCode(e.target.value)} placeholder="e.g. DTO-01" className="uppercase font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude <span className="text-rose-500">*</span></Label>
                  <Input required type="number" step="any" value={lat} onChange={e => setLat(e.target.value ? Number(e.target.value) : '')} placeholder="40.7128" />
                </div>
                <div className="space-y-2">
                  <Label>Longitude <span className="text-rose-500">*</span></Label>
                  <Input required type="number" step="any" value={lng} onChange={e => setLng(e.target.value ? Number(e.target.value) : '')} placeholder="-74.0060" />
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={captureCurrentLocation} className="w-fit text-xs">
                <MapPin className="h-3 w-3 mr-2" /> Use Current Location
              </Button>
              <div className="space-y-2 pt-2 border-t">
                <Label>Geofence Radius (meters) <span className="text-rose-500">*</span></Label>
                <Input required type="number" min="10" max="5000" value={radius} onChange={e => setRadius(e.target.value ? Number(e.target.value) : '')} />
                <p className="text-[10px] text-muted-foreground">The distance from the coordinates where employees will be prompted to clock in.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSite ? 'Save Changes' : 'Create Site'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}