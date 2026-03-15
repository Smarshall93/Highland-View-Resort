import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, MoreVertical, Loader2, Trash2, Copy, Zap, BrainCircuit, Users, Edit, Shield, Search, Folder, Grid, List, ChevronRight, Filter, Printer, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { QRForm, FormField, FormFieldType, TaskPriority, RoutingMode } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
export function QRFormsPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const users = useDataStore(s => s.users);
  const syncData = useDataStore(s => s.syncData);
  const navigate = useNavigate();
  const [forms, setForms] = useState<QRForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('All Forms');
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('General');
  const [folder, setFolder] = useState('Default');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [routing, setRouting] = useState<RoutingMode>('fixed');
  const [targetRoleId, setTargetRoleId] = useState<string>('');
  const [defaultAssignees, setDefaultAssignees] = useState<string[]>([]);
  const [fields, setFields] = useState<FormField[]>([
    { id: `f_${Date.now()}`, type: 'text', label: 'Your Name', required: true }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrModalForm, setQrModalForm] = useState<QRForm | null>(null);
  const isOwner = currentUserRole === 'owner';
  const canMutate = (currentUserRole === 'admin' || currentUserRole === 'manager') && !isOwner;
  useEffect(() => {
    fetchForms();
  }, []);
  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const res = await api<{items: QRForm[]}>('/api/qr-forms?limit=200');
      setForms(res.items || []);
    } catch (error) {
      console.error('Failed to fetch QR forms:', error);
      toast.error('Failed to load operational forms');
    } finally {
      setIsLoading(false);
    }
  };
  const folders = useMemo(() => {
    const set = new Set<string>();
    forms.forEach(f => {
      if (f.folder) set.add(f.folder);
      if (f.category) set.add(f.category);
    });
    return ['All Forms', ...Array.from(set).sort()];
  }, [forms]);
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           f.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = selectedFolder === 'All Forms' || 
                           f.folder === selectedFolder || 
                           f.category === selectedFolder;
      return matchesSearch && matchesFolder;
    });
  }, [forms, searchQuery, selectedFolder]);
  const uniqueRoles = useMemo(() => {
    const roles = new Map<string, string>();
    users.forEach(u => {
      u.shiftRoles?.forEach(r => roles.set(r.id, r.title));
    });
    return Array.from(roles.entries()).map(([id, title]) => ({ id, title }));
  }, [users]);
  const resetForm = () => {
    setTitle(''); setDesc(''); setCategory('General'); setFolder('Default');
    setPriority('medium'); setRouting('fixed'); setTargetRoleId('');
    setDefaultAssignees([]); setFields([{ id: `f_${Date.now()}`, type: 'text', label: 'Your Name', required: true }]);
    setIsEditMode(false); setEditingId(null);
  };
  const handleOpenEdit = (f: QRForm) => {
    setTitle(f.title); setDesc(f.description || ''); setCategory(f.category || 'General');
    setFolder(f.folder || 'Default'); setPriority(f.autoPriority || 'medium');
    setRouting(f.routingMode || 'fixed'); setTargetRoleId(f.targetRoleId || '');
    setDefaultAssignees(f.defaultAssignees || []); setFields(JSON.parse(JSON.stringify(f.fields)));
    setEditingId(f.id); setIsEditMode(true); setIsModalOpen(true);
  };
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMutate || !title.trim()) return;
    setIsProcessing(true);
    try {
      const payload: Partial<QRForm> = {
        title, description: desc, category, folder, autoPriority: priority,
        routingMode: routing, targetRoleId: routing === 'active_role' ? targetRoleId : undefined,
        defaultAssignees: routing === 'fixed' ? defaultAssignees : [], fields
      };
      if (isEditMode && editingId) {
        const updated = await api<QRForm>(`/api/qr-forms/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setForms(prev => prev.map(f => f.id === editingId ? updated : f));
        toast.success('Form configuration updated');
      } else {
        const created = await api<QRForm>('/api/qr-forms', { method: 'POST', body: JSON.stringify(payload) });
        setForms(prev => [created, ...prev]);
        toast.success('Operational QR deployed');
      }
      setIsModalOpen(false); resetForm();
    } catch (err) {
      toast.error('Deployment failed');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!canMutate || !window.confirm("Admin: Decommission this form?")) return;
    try {
      await api(`/api/qr-forms/${id}`, { method: 'DELETE' });
      setForms(prev => prev.filter(f => f.id !== id));
      toast.success('Decommissioned');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
              <QrCode className="h-10 w-10 text-primary" />
              Smart Form Manager
            </h1>
            <p className="text-muted-foreground font-medium text-lg">Organize and automate over 70+ resort operational routes.</p>
          </div>
          {canMutate && (
            <Button size="lg" onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-14 px-8 rounded-2xl shadow-xl hover:scale-105 transition-all font-black gap-2">
              <Plus className="h-5 w-5" /> Build Smart Form
            </Button>
          )}
        </div>
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* FOLDER SIDEBAR */}
          <div className="lg:col-span-3 space-y-6 hidden lg:block">
            <Card className="rounded-3xl border-none shadow-sm bg-muted/30">
               <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Folder className="h-4 w-4 text-primary" /> Library Folders
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-2 pt-0 space-y-1">
                  {folders.map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedFolder(f)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold group",
                        selectedFolder === f ? "bg-primary text-white shadow-lg" : "hover:bg-background text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className={cn("h-4 w-4", selectedFolder === f ? "text-white" : "text-primary/50 group-hover:text-primary")} />
                        {f}
                      </div>
                      <ChevronRight className={cn("h-3 w-3 opacity-50", selectedFolder === f ? "block" : "hidden")} />
                    </button>
                  ))}
               </CardContent>
            </Card>
            <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Zap className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-amber-400">Quick Tools</p>
               </div>
               <Button onClick={() => navigate('/qr-print')} variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 font-bold gap-3 rounded-xl">
                 <Printer className="h-4 w-4" /> Print Stationery
               </Button>
               <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 font-bold gap-3 rounded-xl">
                 <Download className="h-4 w-4" /> Export Config (CSV)
               </Button>
            </div>
          </div>
          {/* FORM GRID / LIST */}
          <div className="lg:col-span-9 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search 70+ forms by title, description or code..." 
                  className="h-14 pl-12 pr-4 rounded-2xl border-none shadow-sm bg-background text-lg"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-2xl border border-border/50 shrink-0">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-10 w-10 rounded-xl"><Grid className="h-5 w-5"/></Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-10 w-10 rounded-xl"><List className="h-5 w-5"/></Button>
              </div>
            </div>
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-[2rem]" />)}
              </div>
            ) : filteredForms.length > 0 ? (
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? "md:grid-cols-2" : "grid-cols-1"
              )}>
                {filteredForms.map(form => (
                  <Card key={form.id} className={cn(
                    "group hover:shadow-2xl transition-all border-none shadow-sm rounded-[2rem] overflow-hidden bg-card",
                    viewMode === 'list' && "flex items-center"
                  )}>
                    <CardContent className={cn("p-8 w-full", viewMode === 'list' ? "flex items-center justify-between" : "space-y-6")}>
                      <div className={cn("flex gap-6", viewMode === 'list' ? "items-center flex-1" : "flex-col sm:flex-row sm:items-start")}>
                         <div className="h-20 w-20 bg-white rounded-2xl border-2 flex items-center justify-center p-3 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                            <QRCodeSVG value={`${window.location.origin}/f/${form.id}`} size={60} />
                         </div>
                         <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-3">
                               <h3 className="font-black text-xl group-hover:text-primary transition-colors truncate">{form.title}</h3>
                               <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest h-5 px-2 bg-muted/50 border-none">{form.folder || 'Default'}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 font-medium">{form.description || 'No description provided.'}</p>
                            <div className="flex flex-wrap gap-2 pt-4">
                               <Badge className="text-[9px] font-black uppercase rounded-full bg-primary/5 text-primary border-primary/10 border h-5 px-2">
                                 <Zap className="h-2.5 w-2.5 mr-1" /> Priority: {form.autoPriority}
                               </Badge>
                               <Badge variant="outline" className="text-[9px] font-black uppercase rounded-full h-5 px-2">
                                 {form.routingMode?.replace('_', ' ')}
                               </Badge>
                            </div>
                         </div>
                         {viewMode === 'grid' && (
                             <div className="flex flex-col gap-2 shrink-0 self-start sm:self-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted"><MoreVertical className="h-5 w-5" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl p-2 w-48">
                                     <DropdownMenuItem onClick={() => handleOpenEdit(form)} className="font-bold rounded-lg gap-2 px-3 py-2.5"><Edit className="h-4 w-4" /> Modify Config</DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`); toast.success('Link Copied'); }} className="font-bold rounded-lg gap-2 px-3 py-2.5"><Copy className="h-4 w-4" /> Copy Link</DropdownMenuItem>
                                     <DropdownMenuSeparator />
                                     <DropdownMenuItem onClick={() => handleDelete(form.id)} className="text-destructive font-bold rounded-lg gap-2 px-3 py-2.5"><Trash2 className="h-4 w-4" /> Decommission</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                         )}
                      </div>
                      {viewMode === 'list' && (
                          <div className="flex items-center gap-3">
                             <Button variant="outline" size="sm" onClick={() => handleOpenEdit(form)} className="font-bold h-10 rounded-xl px-4">Edit</Button>
                             <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl"><MoreVertical className="h-4 w-4" /></Button>
                          </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/10">
                <QrCode className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
                <h3 className="text-2xl font-black">Library Empty</h3>
                <p className="text-muted-foreground mt-2 max-w-xs mx-auto font-medium">No forms found matching your current filter criteria.</p>
              </div>
            )}
          </div>
        </div>
        {/* Builder Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <DialogHeader className="p-10 border-b bg-muted/20">
              <DialogTitle className="text-4xl font-black tracking-tighter">{isEditMode ? 'Modify Form' : 'Design Smart Form'}</DialogTitle>
              <DialogDescription className="font-bold text-lg text-primary">Configure operational routing and data fields.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Form Identity</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Poolside Towel Request" required className="h-14 rounded-2xl border-2 text-lg font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Library Folder</Label>
                    <Input value={folder} onChange={e => setFolder(e.target.value)} placeholder="e.g. Housekeeping" className="h-14 rounded-2xl border-2 text-lg font-bold" />
                  </div>
                </div>
                <div className="p-8 bg-primary/5 rounded-[2rem] border-2 border-primary/10 space-y-8">
                  <div className="flex items-center gap-3 text-primary font-black text-xs uppercase tracking-[0.2em]">
                    <BrainCircuit className="h-6 w-6" /> Intelligent Automation
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest">Auto Priority</Label>
                      <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                        <SelectTrigger className="bg-background h-12 rounded-xl border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent Escalation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest">Routing Strategy</Label>
                      <Select value={routing} onValueChange={v => setRouting(v as RoutingMode)}>
                        <SelectTrigger className="bg-background h-12 rounded-xl border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="fixed">Fixed Team Pool</SelectItem>
                          <SelectItem value="active_role">Active Shift Routing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <Label className="text-2xl font-black tracking-tighter">Information Fields</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFields([...fields, { id: `f_${Date.now()}`, type: 'text', label: 'New Field', required: false }])} className="rounded-full font-black text-[10px] h-9 px-5 uppercase tracking-widest border-2">
                      <Plus className="h-3 w-3 mr-2" /> Add Field
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {fields.map((field, idx) => (
                      <Card key={field.id} className="border-2 border-dashed bg-muted/10 rounded-2xl">
                        <CardContent className="p-6 flex gap-6 items-center">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <Input value={field.label} onChange={e => {
                                const next = [...fields]; next[idx].label = e.target.value; setFields(next);
                            }} placeholder="Field Label (e.g. Your Room Number)" className="h-12 rounded-xl" />
                            <Select value={field.type} onValueChange={v => {
                                const next = [...fields]; next[idx].type = v as FormFieldType; setFields(next);
                            }}>
                              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short Input</SelectItem>
                                <SelectItem value="textarea">Large Text Area</SelectItem>
                                <SelectItem value="select">Dropdown Menu</SelectItem>
                                <SelectItem value="checkbox">Toggle/Checkbox</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setFields(fields.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive h-10 w-10 shrink-0">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-10 border-t bg-muted/20 flex justify-end gap-4 shrink-0">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="h-14 px-8 rounded-2xl font-bold text-lg">Cancel</Button>
                <Button disabled={isProcessing} type="submit" className="rounded-2xl h-14 px-12 font-black text-lg shadow-xl">
                  {isProcessing ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : 'Deploy Form'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}