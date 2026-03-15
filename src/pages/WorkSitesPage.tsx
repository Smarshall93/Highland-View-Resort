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
  const [siteCode, setSiteCode] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [radius, setRadius] = useState<number | ''>(100);
  const isOwner = currentUserRole === 'owner';
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const canMutate = currentUserRole === 'admin' || currentUserRole === 'manager';
  useEffect(() => {
    if (currentUserId && (isManagerOrAdmin || isOwner)) {
      syncData(currentUserId, currentUserRole);
    }
  }, [currentUserId, currentUserRole, syncData]);
  if (!isManagerOrAdmin && !isOwner) return <Navigate to="/" replace />;
  const resetForm = () => {
    setSiteCode(''); setName(''); setLat(''); setLng(''); setRadius(100); setEditingSite(null);
  };
  const handleOpenEdit = (site: WorkSite) => {
    setEditingSite(site); setSiteCode(site.siteCode); setName(site.name);
    setLat(site.lat); setLng(site.lng); setRadius(site.radius);
    setIsModalOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOwner) return;
    if (!name || !siteCode || lat === '' || lng === '' || radius === '') return;
    setIsCreating(true);
    try {
      const payload = { siteCode, name, lat: Number(lat), lng: Number(lng), radius: Number(radius) };
      if (editingSite) {
        const updated = await api<WorkSite>(`/api/work-sites/${editingSite.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        updateWorkSiteLocal(editingSite.id, updated);
        toast.success('Updated');
      } else {
        const created = await api<WorkSite>('/api/work-sites', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        addWorkSiteLocal(created);
        toast.success('Created');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error('Failed to save');
    } finally {
      setIsCreating(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (isOwner) return;
    if (!window.confirm("Delete this site?")) return;
    try {
      deleteWorkSiteLocal(id);
      await api(`/api/work-sites/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed');
    }
  };
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Map className="h-8 w-8 text-primary" />Work Sites</h1>
            <p className="text-muted-foreground">Manage physical locations and geofences.</p>
          </div>
          {canMutate && (
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Work Site</Button>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workSites.map(site => (
            <Card key={site.id} className="group border-t-4 border-t-primary">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{site.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground uppercase bg-muted/50 px-2 rounded mt-1">Code: {site.siteCode}</p>
                  </div>
                  {canMutate && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(site)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(site.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                  <div className="flex items-center gap-2"><Navigation className="h-4 w-4 text-emerald-600" /><span>Radius: {site.radius}m</span></div>
                  <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-blue-500" /><span className="text-xs font-mono">{site.lat.toFixed(4)}, {site.lng.toFixed(4)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSave}>
            <DialogHeader><DialogTitle>{editingSite ? 'Edit' : 'Add'} Work Site</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Site Name</Label><Input required value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Site Code</Label><Input required value={siteCode} onChange={e => setSiteCode(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Lat</Label><Input required type="number" step="any" value={lat} onChange={e => setLat(e.target.value ? Number(e.target.value) : '')} /></div>
                <div className="space-y-2"><Label>Lng</Label><Input required type="number" step="any" value={lng} onChange={e => setLng(e.target.value ? Number(e.target.value) : '')} /></div>
              </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}