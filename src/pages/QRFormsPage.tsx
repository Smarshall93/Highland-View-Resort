import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, ExternalLink, Printer, MoreVertical, Loader2, Trash2, Copy, User as UserIcon, CheckCircle2, Clock, Inbox, MapPin, Edit } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import type { QRForm, FormField, FormFieldType } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
export function QRFormsPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const [forms, setForms] = useState<QRForm[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState('forms');
  const syncData = useDataStore(s => s.syncData);
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'submissions') {
      fetchSubmissions();
    }
  };
  const users = useDataStore(s => s.users);
  const locations = useDataStore(s => s.locations);
  const newSubmissionsCount = submissions.filter(s => s.status === 'new').length;
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDefaultAssignees, setNewDefaultAssignees] = useState<string[]>([]);
  const [newLocationId, setNewLocationId] = useState<string>('none');
  const [newFields, setNewFields] = useState<FormField[]>([
    { id: `f_${Date.now()}`, type: 'text', label: 'Your Name', required: true }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editDefaultAssignees, setEditDefaultAssignees] = useState<string[]>([]);
  const [editLocationId, setEditLocationId] = useState<string>('none');
  const [editFields, setEditFields] = useState<FormField[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // QR Modal State
  const [qrModalForm, setQrModalForm] = useState<QRForm | null>(null);
  useEffect(() => {
    fetchForms();
    fetchSubmissions();
  }, []);
  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const res = await api<{items: any[]}>('/api/submissions?limit=50');
      setSubmissions(res.items || []);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };
  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const res = await api<{items: QRForm[]}>('/api/qr-forms?limit=50');
      setForms(res.items || []);
    } catch (error) {
      console.error('Failed to fetch QR forms:', error);
      toast.error('Failed to load QR forms');
    } finally {
      setIsLoading(false);
    }
  };
  const groupedForms = useMemo(() => {
    const groups = forms.reduce((acc, form) => {
      const cat = form.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(form);
      return acc;
    }, {} as Record<string, QRForm[]>);
    return Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, QRForm[]>);
  }, [forms]);
  const existingCategories = useMemo(() => {
    const cats = new Set(forms.map(f => f.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [forms]);
  // Create Form Methods
  const addField = () => {
    setNewFields([
      ...newFields,
      { id: `f_${Date.now()}`, type: 'text', label: 'New Field', required: false }
    ]);
  };
  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...newFields];
    updated[index] = { ...updated[index], ...updates };
    setNewFields(updated);
  };
  const removeField = (index: number) => {
    setNewFields(newFields.filter((_, i) => i !== index));
  };
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const payload: Partial<QRForm> = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        fields: newFields,
        defaultAssignees: newDefaultAssignees,
        locationId: newLocationId === 'none' ? undefined : newLocationId
      };
      const created = await api<QRForm>('/api/qr-forms', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setForms(prev => [created, ...prev]);
      toast.success('QR Form created successfully');
      setIsCreateModalOpen(false);
      // Reset
      setNewTitle('');
      setNewDesc('');
      setNewCategory('General');
      setNewDefaultAssignees([]);
      setNewLocationId('none');
      setNewFields([{ id: `f_${Date.now()}`, type: 'text', label: 'Your Name', required: true }]);
      syncData(currentUserId, currentUserRole, true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create form');
    } finally {
      setIsCreating(false);
    }
  };
  // Edit Form Methods
  const handleOpenEdit = (form: QRForm) => {
    setEditingFormId(form.id);
    setEditTitle(form.title);
    setEditDesc(form.description || '');
    setEditCategory(form.category || 'General');
    setEditDefaultAssignees(form.defaultAssignees || []);
    setEditLocationId(form.locationId || 'none');
    setEditFields(JSON.parse(JSON.stringify(form.fields || []))); // deep copy
    setIsEditModalOpen(true);
  };
  const addEditField = () => {
    setEditFields([
      ...editFields,
      { id: `f_${Date.now()}`, type: 'text', label: 'New Field', required: false }
    ]);
  };
  const updateEditField = (index: number, updates: Partial<FormField>) => {
    const updated = [...editFields];
    updated[index] = { ...updated[index], ...updates };
    setEditFields(updated);
  };
  const removeEditField = (index: number) => {
    setEditFields(editFields.filter((_, i) => i !== index));
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFormId || !editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      const payload: Partial<QRForm> = {
        title: editTitle,
        description: editDesc,
        category: editCategory,
        fields: editFields,
        defaultAssignees: editDefaultAssignees,
        locationId: editLocationId === 'none' ? undefined : editLocationId
      };
      const updated = await api<QRForm>(`/api/qr-forms/${editingFormId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setForms(prev => prev.map(f => f.id === editingFormId ? updated : f));
      toast.success('QR Form updated successfully');
      setIsEditModalOpen(false);
      syncData(currentUserId, currentUserRole, true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update form');
    } finally {
      setIsSavingEdit(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this form?")) return;
    try {
      await api(`/api/qr-forms/${id}`, { method: 'DELETE' });
      setForms(prev => prev.filter(f => f.id !== id));
      toast.success('Form deleted');
      syncData(currentUserId, currentUserRole, true);
    } catch (err) {
      toast.error('Failed to delete form');
    }
  };
  const getPublicUrl = (formId: string) => {
    return `${window.location.origin}/f/${formId}`;
  };
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };
  const getAssigneeNames = (ids?: string[]) => {
    if (!ids || ids.length === 0) return null;
    const names = ids.map(id => users.find(u => u.id === id)?.name?.split(' ')[0]).filter(Boolean);
    return names.join(', ');
  };
  const handleProcessSubmission = async (id: string) => {
    try {
      await api(`/api/submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'processed' })
      });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'processed' } : s));
      toast.success('Submission marked as processed');
    } catch (error) {
      toast.error('Failed to update submission');
    }
  };
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <QrCode className="h-8 w-8 text-primary" />
              QR Code Forms
            </h1>
            <p className="text-muted-foreground mt-1">Create public forms and generate scannable QR codes for customers.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-sm hover:shadow-md transition-all">
              <Plus className="mr-2 h-4 w-4" /> Create Form
            </Button>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="mb-0">
              <TabsTrigger value="forms">Active Forms</TabsTrigger>
              <TabsTrigger value="submissions" className="relative">
              Submissions
              {newSubmissionsCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {newSubmissionsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            {activeTab === 'submissions' && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubmissions}
                disabled={isLoadingSubmissions}
                className="h-8 shadow-sm"
              >
                {isLoadingSubmissions ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Clock className="h-3.5 w-3.5 mr-2" />
                )}
                Refresh
              </Button>
            )}
          </div>
          <TabsContent value="forms">
            {/* Main Content Area */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : forms.length > 0 ? (
              <Accordion type="multiple" defaultValue={Object.keys(groupedForms)} className="w-full space-y-4">
                {Object.entries(groupedForms).map(([category, categoryForms]) => (
                  <AccordionItem key={category} value={category} className="border bg-card rounded-xl shadow-sm overflow-hidden px-2 sm:px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{category}</h3>
                        <Badge variant="secondary" className="ml-2 bg-muted/50">{categoryForms.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <div className="flex flex-col gap-3">
                        {categoryForms.map(form => {
                          const publicUrl = getPublicUrl(form.id);
                          const assigneeNames = getAssigneeNames(form.defaultAssignees);
                          const formLoc = form.locationId ? locations.find(l => l.id === form.locationId) : null;
                          return (
                            <div key={form.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-base truncate">{form.title}</h4>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(form.createdAt), 'MMM d, yy')}
                                  </span>
                                </div>
                                {form.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{form.description}</p>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {assigneeNames ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium max-w-[200px] truncate">
                                      <UserIcon className="h-3 w-3 shrink-0" />
                                      <span className="truncate">Routes to: {assigneeNames}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground max-w-[200px] truncate">
                                      <UserIcon className="h-3 w-3 shrink-0" />
                                      <span className="truncate">Unassigned tasks</span>
                                    </div>
                                  )}
                                  {formLoc && (
                                    <Badge variant="outline" className="bg-background shadow-sm px-2 text-foreground font-medium text-[10px] h-5">
                                      <MapPin className="w-2.5 h-2.5 mr-1 text-primary" /> {formLoc.name}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10px] h-5">{form.fields.length} fields</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setQrModalForm(form)}>
                                  <QrCode className="mr-2 h-4 w-4" /> View QR
                                </Button>
                                <Button variant="default" size="sm" onClick={() => {
                                  setQrModalForm(form);
                                  setTimeout(() => window.print(), 100);
                                }} className="hidden sm:flex shadow-sm">
                                  <Printer className="mr-2 h-4 w-4" /> Print
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleOpenEdit(form)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Form
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyLink(publicUrl)}>
                                      <Copy className="mr-2 h-4 w-4" /> Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center w-full cursor-pointer">
                                        <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDelete(form.id)} className="text-destructive focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Form
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/10">
                <QrCode className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No QR Forms yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Create your first dynamic form to generate a QR code.
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  Create Form
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="submissions">
            {isLoadingSubmissions ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.map((sub) => {
                  const form = forms.find(f => f.id === sub.formId);
                  return (
                    <Card key={sub.id} className={sub.status === 'processed' ? 'opacity-70' : ''}>
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-sm font-bold">{form?.title || 'Unknown Form'}</CardTitle>
                          <CardDescription className="text-xs">
                            Submitted {format(new Date(sub.submittedAt || sub.createdAt), 'MMM d, h:mm a')}
                          </CardDescription>
                        </div>
                        <Badge variant={sub.status === 'processed' ? 'outline' : 'default'} className="flex items-center gap-1 shadow-sm">
                          {sub.status === 'processed' ? (
                            <><CheckCircle2 className="h-3 w-3" /> Processed</>
                          ) : (
                            <><Clock className="h-3 w-3" /> New</>
                          )}
                        </Badge>
                      </CardHeader>
                      <CardContent className="py-3 px-4 bg-muted/20">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {Object.entries(sub.data || {}).map(([key, val]: [string, any]) => {
                            const fieldLabel = form?.fields?.find(f => f.id === key)?.label || key;
                            return (
                              <div key={key} className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{fieldLabel}</p>
                                <p className="text-sm font-medium">{String(val)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                      <CardFooter className="py-2 px-4 flex justify-end">
                        {sub.status !== 'processed' && (
                          <Button size="sm" variant="outline" onClick={() => handleProcessSubmission(sub.id)}>
                            Mark as Processed
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/10">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No submissions yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  When customers scan your QR codes and submit forms, they will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        {/* Create Form Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col overflow-hidden">
            <form onSubmit={handleCreateForm} className="flex flex-col h-full overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create Dynamic Form</DialogTitle>
                <DialogDescription>
                  Customers will scan a QR code to fill out this form.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 overflow-y-auto px-1 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="title">Form Title <span className="text-rose-500">*</span></Label>
                  <Input
                    id="title"
                    placeholder="e.g. Table Request, Equipment Repair"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      list="categories"
                      placeholder="e.g. Customer Service"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <datalist id="categories">
                      {existingCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Facility Location</Label>
                    <Select value={newLocationId} onValueChange={(v) => setNewLocationId(v)}>
                      <SelectTrigger id="location">
                        <SelectValue placeholder="No location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No location</SelectItem>
                        {locations.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Instructions for the user"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Assignee (Auto-Routing)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/10 space-y-1">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                          <Checkbox
                            checked={newDefaultAssignees.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewDefaultAssignees(prev => [...prev, user.id]);
                              } else {
                                setNewDefaultAssignees(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <span className="text-sm">{user.name}</span>
                        </label>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tasks generated from this form will automatically be assigned to selected users.</p>
                </div>
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Form Fields</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addField}>
                      <Plus className="mr-1 h-3 w-3" /> Add Field
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {newFields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-lg bg-muted/20 flex gap-3 items-start relative group">
                        <div className="flex-1 space-y-3">
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Field Label"
                            className="h-8 text-sm"
                            required
                          />
                          <div className="flex items-center gap-2">
                            <Select
                              value={field.type}
                              onValueChange={(val: FormFieldType) => updateField(index, { type: val })}
                            >
                              <SelectTrigger className="h-8 text-xs w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                              </SelectContent>
                            </Select>
                            <label className="flex items-center text-xs text-muted-foreground gap-1.5 ml-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                className="rounded border-gray-300 text-primary"
                              />
                              Required
                            </label>
                          </div>
                          {field.type === 'select' && (
                            <Input
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              placeholder="Comma separated options (e.g. Red, Blue, Green)"
                              className="h-8 text-xs mt-2"
                            />
                          )}
                        </div>
                        {newFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeField(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4 pt-4 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newTitle.trim()}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Form
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* Edit Form Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSaveEdit} className="flex flex-col h-full overflow-hidden">
              <DialogHeader>
                <DialogTitle>Edit Dynamic Form</DialogTitle>
                <DialogDescription>
                  Modify the form details and custom fields.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 overflow-y-auto px-1 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Form Title <span className="text-rose-500">*</span></Label>
                  <Input
                    id="edit-title"
                    placeholder="e.g. Table Request, Equipment Repair"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      list="edit-categories"
                      placeholder="e.g. Customer Service"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    />
                    <datalist id="edit-categories">
                      {existingCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Facility Location</Label>
                    <Select value={editLocationId} onValueChange={(v) => setEditLocationId(v)}>
                      <SelectTrigger id="edit-location">
                        <SelectValue placeholder="No location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No location</SelectItem>
                        {locations.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input
                    id="edit-description"
                    placeholder="Instructions for the user"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Assignee (Auto-Routing)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/10 space-y-1">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                          <Checkbox
                            checked={editDefaultAssignees.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditDefaultAssignees(prev => [...prev, user.id]);
                              } else {
                                setEditDefaultAssignees(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <span className="text-sm">{user.name}</span>
                        </label>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tasks generated from this form will automatically be assigned to selected users.</p>
                </div>
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Form Fields</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addEditField}>
                      <Plus className="mr-1 h-3 w-3" /> Add Field
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {editFields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-lg bg-muted/20 flex gap-3 items-start relative group">
                        <div className="flex-1 space-y-3">
                          <Input
                            value={field.label}
                            onChange={(e) => updateEditField(index, { label: e.target.value })}
                            placeholder="Field Label"
                            className="h-8 text-sm"
                            required
                          />
                          <div className="flex items-center gap-2">
                            <Select
                              value={field.type}
                              onValueChange={(val: FormFieldType) => updateEditField(index, { type: val })}
                            >
                              <SelectTrigger className="h-8 text-xs w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                              </SelectContent>
                            </Select>
                            <label className="flex items-center text-xs text-muted-foreground gap-1.5 ml-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateEditField(index, { required: e.target.checked })}
                                className="rounded border-gray-300 text-primary"
                              />
                              Required
                            </label>
                          </div>
                          {field.type === 'select' && (
                            <Input
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateEditField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              placeholder="Comma separated options (e.g. Red, Blue, Green)"
                              className="h-8 text-xs mt-2"
                            />
                          )}
                        </div>
                        {editFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeEditField(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4 pt-4 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit || !editTitle.trim()}>
                  {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* View/Print QR Modal */}
        <Dialog open={!!qrModalForm} onOpenChange={(open) => !open && setQrModalForm(null)}>
          {qrModalForm && (
            <DialogContent className="sm:max-w-md text-center">
              <DialogHeader>
                <DialogTitle>{qrModalForm.title}</DialogTitle>
                <DialogDescription>Print this QR code to place at the physical location.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl my-4 print:bg-white print:p-0 print:my-0">
                <div className="p-4 bg-white rounded-xl shadow-sm border mb-4 print:border-none print:shadow-none print:p-0 print:mb-0">
                  <QRCodeSVG value={getPublicUrl(qrModalForm.id)} size={200} level="H" className="print:w-64 print:h-64" />
                </div>
                <div className="flex items-center gap-2 max-w-[250px] mx-auto bg-background border p-2 rounded-md w-full justify-between print:hidden">
                  <p className="text-sm font-mono text-muted-foreground truncate select-all">
                    {getPublicUrl(qrModalForm.id)}
                  </p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopyLink(getPublicUrl(qrModalForm.id))}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <DialogFooter className="sm:justify-center flex-row gap-2 print:hidden">
                <Button variant="outline" onClick={() => setQrModalForm(null)}>Close</Button>
                <Button onClick={() => window.print()} className="hidden sm:inline-flex shadow-sm">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppLayout>
  );
}