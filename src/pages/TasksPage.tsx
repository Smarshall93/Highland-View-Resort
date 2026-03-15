import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  CheckSquare, Plus, Clock, CheckCircle2, Circle, MoreVertical,
  Calendar, Loader2, User as UserIcon, Camera, Maximize2, Trash2, PauseCircle, PlayCircle, AlertCircle, AlertTriangle, QrCode, Edit, MapPin, Repeat, FileSignature, Navigation
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Task, TaskStatus, TaskPriority, FormField, Location, TaskChecklistItem } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
const formatTaskDuration = (ms: number) => {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};
// GPS Helper Function
const fetchLocation = async (): Promise<Location | undefined> => {
  if (!('geolocation' in navigator)) return undefined;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        console.info('Geolocation error:', err);
        resolve(undefined);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
};
export function TasksPage() {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const tasks = useDataStore(s => s.tasks);
  const users = useDataStore(s => s.users);
  const locations = useDataStore(s => s.locations);
  const qrForms = useDataStore(s => s.qrForms);
  const addTaskLocal = useDataStore(s => s.addTaskLocal);
  const updateTaskLocal = useDataStore(s => s.updateTaskLocal);
  const deleteTaskLocal = useDataStore(s => s.deleteTaskLocal);
  const syncData = useDataStore(s => s.syncData);
  const [filter, setFilter] = useState<TaskStatus | 'all' | 'templates'>('all');
  const [now, setNow] = useState(Date.now());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskLocationId, setNewTaskLocationId] = useState<string>('none');
  const [newTaskIsDaily, setNewTaskIsDaily] = useState(false);
  const [newTaskLinkedFormId, setNewTaskLinkedFormId] = useState<string>('none');
  const [newTaskChecklist, setNewTaskChecklist] = useState<TaskChecklistItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [taskPhoto, setTaskPhoto] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskAssignees, setEditTaskAssignees] = useState<string[]>([]);
  const [editTaskPriority, setEditTaskPriority] = useState<TaskPriority>('medium');
  const [editTaskLocationId, setEditTaskLocationId] = useState<string>('none');
  const [editTaskIsDaily, setEditTaskIsDaily] = useState(false);
  const [editTaskLinkedFormId, setEditTaskLinkedFormId] = useState<string>('none');
  const [editTaskChecklist, setEditTaskChecklist] = useState<TaskChecklistItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [fillingTask, setFillingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  useEffect(() => {
    if (currentUserId && currentUserRole) {
      syncData(currentUserId, currentUserRole);
    }
  }, [currentUserId, currentUserRole, syncData]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskAssignees(task.assignees || []);
    setEditTaskPriority(task.priority || 'medium');
    setEditTaskLocationId(task.locationId || 'none');
    setEditTaskIsDaily(!!task.isDailyTemplate);
    setEditTaskLinkedFormId(task.linkedFormId || 'none');
    setEditTaskChecklist(task.checklist ? JSON.parse(JSON.stringify(task.checklist)) : []);
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit || !editTaskTitle.trim()) return;
    setIsEditing(true);
    try {
      const updates: Partial<Task> = {
        title: editTaskTitle,
        description: editTaskDesc,
        priority: editTaskPriority,
        assignees: editTaskAssignees,
        locationId: editTaskLocationId === 'none' ? undefined : editTaskLocationId,
        isDailyTemplate: editTaskIsDaily,
        linkedFormId: editTaskLinkedFormId === 'none' ? undefined : editTaskLinkedFormId,
        checklist: editTaskChecklist.filter(item => item.text.trim() !== '')
      };
      updateTaskLocal(taskToEdit.id, updates);
      toast.success(editTaskIsDaily ? 'Template updated successfully' : 'Task updated successfully');
      setTaskToEdit(null);
      await api<Task>(`/api/tasks/${taskToEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      syncData(currentUserId, currentUserRole);
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
      syncData(currentUserId, currentUserRole);
    } finally {
      setIsEditing(false);
    }
  };
  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      deleteTaskLocal(id);
      toast.success('Deleted successfully');
      await api(`/api/tasks/${id}`, { method: 'DELETE' });
      syncData(currentUserId, currentUserRole);
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete');
      syncData(currentUserId, currentUserRole);
    }
  };
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsCreating(true);
    try {
      const payload: Partial<Task> = {
        title: newTaskTitle,
        description: newTaskDesc,
        status: 'pending',
        priority: newTaskPriority,
        assignees: newTaskAssignees,
        locationId: newTaskLocationId === 'none' ? undefined : newTaskLocationId,
        isDailyTemplate: newTaskIsDaily,
        linkedFormId: newTaskLinkedFormId === 'none' ? undefined : newTaskLinkedFormId,
        checklist: newTaskChecklist.filter(item => item.text.trim() !== '')
      };
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTaskTitle,
        description: newTaskDesc,
        status: 'pending',
        priority: newTaskPriority,
        assignees: newTaskAssignees,
        locationId: newTaskLocationId === 'none' ? undefined : newTaskLocationId,
        isDailyTemplate: newTaskIsDaily,
        linkedFormId: newTaskLinkedFormId === 'none' ? undefined : newTaskLinkedFormId,
        checklist: newTaskChecklist.filter(item => item.text.trim() !== ''),
        createdAt: Date.now(),
        timeSpentMs: 0,
        lastStartedAt: null
      };
      addTaskLocal(optimisticTask);
      toast.success(newTaskIsDaily ? 'Daily Template created' : 'Task created successfully');
      setIsCreateModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignees([]);
      setNewTaskPriority('medium');
      setNewTaskLocationId('none');
      setNewTaskIsDaily(false);
      setNewTaskLinkedFormId('none');
      setNewTaskChecklist([]);
      await api<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      syncData(currentUserId, currentUserRole);
    } catch (error) {
      console.error('Failed to create:', error);
      toast.error('Failed to create');
      syncData(currentUserId, currentUserRole);
    } finally {
      setIsCreating(false);
    }
  };
  const handleToggleChecklistItem = async (taskId: string, itemId: string, completed: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.checklist) return;
      const updatedChecklist = task.checklist.map(item =>
        item.id === itemId ? { ...item, completed } : item
      );
      updateTaskLocal(taskId, { checklist: updatedChecklist });
      await api<Task>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checklist: updatedChecklist })
      });
      syncData(currentUserId, currentUserRole);
    } catch (error) {
      console.error('Failed to update checklist item:', error);
      toast.error('Failed to update checklist item');
      syncData(currentUserId, currentUserRole);
    }
  };
  const handleUpdateStatus = async (id: string, newStatus: TaskStatus) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      setIsProcessingAction(id);
      const updates: Partial<Task> = { status: newStatus };
      if (newStatus === 'in_progress') {
         updates.lastStartedAt = Date.now();
         toast.info('Acquiring location for task claim...');
         const loc = await fetchLocation();
         if (loc) {
           updates.claimLocation = loc;
         } else {
           toast.warning('Task claimed, but GPS location was unavailable.');
         }
      } else if (newStatus === 'pending' || newStatus === 'completed') {
         if (task.status === 'in_progress' && task.lastStartedAt) {
           const elapsed = Date.now() - task.lastStartedAt;
           updates.timeSpentMs = (task.timeSpentMs || 0) + elapsed;
         }
         updates.lastStartedAt = null;
         if (newStatus === 'completed') {
             toast.info('Acquiring final location for completion...');
             updates.completedAt = Date.now();
             const loc = await fetchLocation();
             if (loc) updates.completionLocation = loc;
         }
      }
      updateTaskLocal(id, updates);
      if (newStatus === 'pending') {
        toast.success(task.timeSpentMs && task.timeSpentMs > 0 ? 'Task paused' : 'Task marked as pending');
      } else if (newStatus === 'in_progress') {
        toast.success('Task claimed and started');
      } else {
        toast.success('Task status updated');
      }
      await api<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      syncData(currentUserId, currentUserRole);
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
      syncData(currentUserId, currentUserRole);
    } finally {
      setIsProcessingAction(null);
    }
  };
  const handleToggleAssignee = async (id: string, userId: string, isAssigned: boolean) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      let newAssignees = [...(task.assignees || [])];
      if (isAssigned) {
        if (!newAssignees.includes(userId)) newAssignees.push(userId);
      } else {
        newAssignees = newAssignees.filter(uId => uId !== userId);
      }
      updateTaskLocal(id, { assignees: newAssignees });
      toast.success('Assignees updated');
      await api<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignees: newAssignees })
      });
      syncData(currentUserId, currentUserRole);
    } catch (error) {
      console.error('Failed to update assignees:', error);
      toast.error('Failed to update assignees');
      syncData(currentUserId, currentUserRole);
    }
  };
  const handleCompletePrompt = (id: string) => {
    setCompletingTaskId(id);
    setTaskPhoto(null);
  };
  const handleConfirmComplete = async () => {
    if (!completingTaskId) return;
    setIsProcessingAction(completingTaskId);
    try {
      const task = tasks.find(t => t.id === completingTaskId);
      if (!task) return;
      toast.info('Acquiring final location for completion...', { duration: 3000 });
      const loc = await fetchLocation();
      const updates: Partial<Task> = { status: 'completed', completedAt: Date.now() };
      if (loc) updates.completionLocation = loc;
      if (taskPhoto) updates.photoUrl = taskPhoto;
      if (task.status === 'in_progress' && task.lastStartedAt) {
         const elapsed = Date.now() - task.lastStartedAt;
         updates.timeSpentMs = (task.timeSpentMs || 0) + elapsed;
      }
      updates.lastStartedAt = null;
      updateTaskLocal(completingTaskId, updates);
      toast.success(loc ? 'Task completed with location attached' : 'Task completed (GPS unavailable)');
      const targetId = completingTaskId;
      setCompletingTaskId(null);
      setTaskPhoto(null);
      await api<Task>(`/api/tasks/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      syncData(currentUserId, currentUserRole);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update task');
      syncData(currentUserId, currentUserRole);
    } finally {
      setIsProcessingAction(null);
    }
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTaskPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const handleOpenFillForm = (task: Task) => {
    setFillingTask(task);
    setFormData({});
    setFormValidationError(null);
  };
  const handleFormChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (formValidationError) setFormValidationError(null);
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fillingTask || !fillingTask.linkedFormId) return;
    const form = qrForms.find(f => f.id === fillingTask.linkedFormId);
    if (!form) return;
    const missingFields = form.fields.filter(f => f.required && !formData[f.id]);
    if (missingFields.length > 0) {
      setFormValidationError(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    setFormSubmitting(true);
    setFormValidationError(null);
    try {
      toast.info('Acquiring location for form submission...');
      const loc = await fetchLocation();
      await api('/api/public/submissions', {
        method: 'POST',
        body: JSON.stringify({
          formId: form.id,
          data: formData
        })
      });
      const updates: Partial<Task> = { status: 'completed', completedAt: Date.now() };
      if (loc) updates.completionLocation = loc;
      if (fillingTask.status === 'in_progress' && fillingTask.lastStartedAt) {
         const elapsed = Date.now() - fillingTask.lastStartedAt;
         updates.timeSpentMs = (fillingTask.timeSpentMs || 0) + elapsed;
      }
      updates.lastStartedAt = null;
      await api<Task>(`/api/tasks/${fillingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      toast.success('Form submitted and task completed!');
      setFillingTask(null);
      syncData(currentUserId, currentUserRole, true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit form');
    } finally {
      setFormSubmitting(false);
    }
  };
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      case 'pending': return <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />;
    }
  };
  const getStatusBadge = (task: Task) => {
    if (task.status === 'completed') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400">Completed</Badge>;
    }
    if (task.status === 'in_progress') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400">In Progress</Badge>;
    }
    if (task.status === 'pending' && (task.timeSpentMs || 0) > 0) {
      return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Paused</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };
  const getPriorityBadge = (priority?: TaskPriority) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-200 shadow-sm border"><AlertCircle className="w-3 h-3 mr-1" /> Urgent</Badge>;
      case 'high': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700/50 shadow-sm">High</Badge>;
      case 'low': return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-200 shadow-sm">Low</Badge>;
      case 'medium':
      default: return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 shadow-sm">Medium</Badge>;
    }
  };
  const getUserInitials = (name: string) => {
    return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  const filteredTasks = tasks.filter(t => {
    if (filter === 'templates') return t.isDailyTemplate === true;
    if (t.isDailyTemplate) return false;
    if (filter === 'all') return true;
    return t.status === filter;
  });
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea id={field.id} value={formData[field.id] || ''} onChange={(e) => handleFormChange(field.id, e.target.value)} className="min-h-[100px] resize-y" placeholder="Type your answer here..." />
        );
      case 'select':
        return (
          <Select value={formData[field.id] || ''} onValueChange={(val) => handleFormChange(field.id, val)}>
            <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
            <SelectContent>{field.options?.map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}</SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-start space-x-3 pt-1">
            <Checkbox id={field.id} checked={!!formData[field.id]} onCheckedChange={(checked) => handleFormChange(field.id, checked)} className="mt-1" />
            <label htmlFor={field.id} className="text-sm font-medium leading-relaxed cursor-pointer">Confirm: {field.label}{field.required && <span className="text-rose-500 ml-1.5">*</span>}</label>
          </div>
        );
      default:
        return (
          <Input type="text" id={field.id} value={formData[field.id] || ''} onChange={(e) => handleFormChange(field.id, e.target.value)} placeholder="Your answer" />
        );
    }
  };
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CheckSquare className="h-8 w-8 text-primary" />
              Tasks & Routines
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentUserRole === 'employee' ? 'Manage your assigned daily operations and track time.' : 'Manage daily operations, checklists, and templates.'}
            </p>
          </div>
          {isManagerOrAdmin && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-sm hover:shadow-md transition-all">
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          )}
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="all" className="px-6">All Tasks</TabsTrigger>
            <TabsTrigger value="pending" className="px-6">Pending</TabsTrigger>
            <TabsTrigger value="in_progress" className="px-6">In Progress</TabsTrigger>
            <TabsTrigger value="completed" className="px-6">Completed</TabsTrigger>
            {isManagerOrAdmin && (
              <TabsTrigger value="templates" className="px-6 bg-primary/5 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Repeat className="w-4 h-4 mr-2" /> Daily Templates
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value={filter} className="mt-0 outline-none">
            {filteredTasks.length > 0 ? (
              <div className="grid gap-4">
                {filteredTasks.map((task) => {
                  let liveDurationMs = task.timeSpentMs || 0;
                  if (task.status === 'in_progress' && task.lastStartedAt) {
                     liveDurationMs += (now - task.lastStartedAt);
                  }
                  const taskLoc = task.locationId ? locations.find(l => l.id === task.locationId) : null;
                  const isTemplate = task.isDailyTemplate;
                  const linkedForm = task.linkedFormId ? qrForms.find(f => f.id === task.linkedFormId) : null;
                  const isLoadingAction = isProcessingAction === task.id;
                  return (
                    <Card key={task.id} className="group hover:shadow-md transition-all border-l-4 overflow-hidden"
                          style={{ borderLeftColor: isTemplate ? '#8b5cf6' : task.status === 'completed' ? '#10b981' : task.status === 'in_progress' ? '#f59e0b' : 'hsl(var(--muted))' }}>
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row p-5 gap-4">
                          {!isTemplate && (
                            <button
                              disabled={isLoadingAction}
                              onClick={() => handleUpdateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                              className="mt-0.5 sm:mt-0 flex-shrink-0 hover:scale-110 transition-transform active:scale-90 disabled:opacity-50"
                            >
                              {isLoadingAction ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : getStatusIcon(task.status)}
                            </button>
                          )}
                          {isTemplate && (
                            <div className="mt-0.5 flex-shrink-0">
                               <Repeat className="h-5 w-5 text-purple-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-base font-semibold truncate ${task.status === 'completed' && !isTemplate ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h3>
                              {isTemplate && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 border-none">Daily Template</Badge>
                              )}
                              {linkedForm && (
                                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:bg-blue-900/20">
                                  <FileSignature className="w-3 h-3 mr-1" /> Form Required
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <div className="text-sm text-foreground/90 mt-2.5 whitespace-pre-wrap bg-muted/40 p-3.5 rounded-lg border border-border/50 max-h-60 overflow-y-auto shadow-inner leading-relaxed">
                                {task.description}
                              </div>
                            )}
                            {task.checklist && task.checklist.length > 0 && (
                              <div className="mt-3 space-y-2.5">
                                {task.checklist.map(item => (
                                  <div key={item.id} className="flex items-start space-x-3 group/check p-1 rounded-md hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                      id={`check-${task.id}-${item.id}`}
                                      checked={item.completed}
                                      onCheckedChange={(checked) => handleToggleChecklistItem(task.id, item.id, !!checked)}
                                      disabled={isTemplate || isLoadingAction || task.status === 'completed'}
                                      className="mt-0.5"
                                    />
                                    <label htmlFor={`check-${task.id}-${item.id}`} className={`text-sm font-medium leading-tight cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground/90'}`}>
                                      {item.text}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                              {!isTemplate && !task.qrCodeId && getPriorityBadge(task.priority)}
                              {task.qrCodeId && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-400 shadow-sm font-semibold px-2">
                                  <QrCode className="w-3 h-3 mr-1.5 inline" /> Customer by QR Code
                                </Badge>
                              )}
                              {taskLoc && (
                                <Badge variant="outline" className="bg-muted shadow-sm px-2 text-foreground font-medium">
                                  <MapPin className="w-3 h-3 mr-1 text-primary" /> {taskLoc.name}
                                </Badge>
                              )}
                              {task.claimLocation && (
                                <Badge variant="secondary" className="px-2 text-[10px] bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800">
                                  <Navigation className="w-3 h-3 mr-1" /> Claimed @ GPS
                                </Badge>
                              )}
                              {task.completionLocation && (
                                <Badge variant="secondary" className="px-2 text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-800">
                                  <Navigation className="w-3 h-3 mr-1" /> Completed @ GPS
                                </Badge>
                              )}
                              {isManagerOrAdmin ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-8 rounded-full text-xs px-3 bg-muted/50 hover:bg-muted/80">
                                      {(!task.assignees || task.assignees.length === 0) ? (
                                        <>
                                          <UserIcon className="h-3 w-3 mr-2 text-slate-400 shrink-0" />
                                          <span className="italic text-muted-foreground">Unassigned</span>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-1 -ml-1">
                                          <div className="flex -space-x-1.5 mr-1">
                                            {task.assignees.slice(0, 3).map(uid => {
                                              const u = users.find(x => x.id === uid);
                                              return u ? (
                                                <div key={uid} className="h-5 w-5 rounded-full bg-primary/10 text-primary border-2 border-background flex items-center justify-center text-[8px] font-medium z-10" title={u.name}>
                                                  {getUserInitials(u.name)}
                                                </div>
                                              ) : null;
                                            })}
                                          </div>
                                          <span>{task.assignees.length} assigned</span>
                                        </div>
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-56">
                                    {users.map(user => {
                                      const isAssigned = (task.assignees || []).includes(user.id);
                                      return (
                                        <DropdownMenuCheckboxItem
                                          key={user.id}
                                          checked={isAssigned}
                                          onCheckedChange={(checked) => handleToggleAssignee(task.id, user.id, checked)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[8px] shrink-0">
                                              {getUserInitials(user.name)}
                                            </div>
                                            <span className="truncate">{user.id === currentUserId ? 'You' : user.name}</span>
                                          </div>
                                        </DropdownMenuCheckboxItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full border">
                                  {task.assignees && task.assignees.length > 0 ? (
                                    <div className="flex -space-x-1.5">
                                      {task.assignees.slice(0, 3).map(uid => {
                                        const u = users.find(x => x.id === uid);
                                        return u ? (
                                          <div key={uid} className="h-5 w-5 rounded-full bg-primary/10 text-primary border border-background flex items-center justify-center font-medium text-[8px]" title={u.name}>
                                            {getUserInitials(u.name)}
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="h-4 w-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><UserIcon className="h-3 w-3" /></div>
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Visible to Everyone</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(task.createdAt), 'MMM d')}
                              </span>
                              {!isTemplate && getStatusBadge(task)}
                              {!isTemplate && (liveDurationMs > 0 || task.status === 'in_progress') && (
                                <span className={`flex items-center gap-1.5 font-medium border px-2 py-0.5 rounded-md shadow-sm ${
                                  task.status === 'in_progress' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30' : 'bg-muted/50'
                                }`}>
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTaskDuration(liveDurationMs)}
                                </span>
                              )}
                            </div>
                            {task.photoUrl && (
                              <div className="mt-3 h-20 w-20 rounded-lg overflow-hidden border shadow-sm cursor-pointer hover:opacity-80 transition-opacity relative group" onClick={() => setSelectedImage(task.photoUrl!)}>
                                <img src={task.photoUrl} alt="Task proof" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Maximize2 className="h-4 w-4" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                            {!isTemplate && task.status === 'pending' && (
                              <Button size="sm" variant="outline" disabled={isLoadingAction} onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                                {isLoadingAction ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
                                {(task.timeSpentMs || 0) > 0 ? 'Resume' : 'Start'}
                              </Button>
                            )}
                            {!isTemplate && task.status === 'in_progress' && (
                              <Button size="sm" variant="outline" disabled={isLoadingAction} onClick={() => handleUpdateStatus(task.id, 'pending')} className="border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                                {isLoadingAction ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PauseCircle className="h-4 w-4 mr-1.5" />}
                                Pause
                              </Button>
                            )}
                            {!isTemplate && task.status !== 'completed' && linkedForm ? (
                               <Button size="sm" disabled={isLoadingAction} onClick={() => handleOpenFillForm(task)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                  <FileSignature className="h-4 w-4 mr-1.5" /> Fill Form
                               </Button>
                            ) : (!isTemplate && task.status === 'in_progress' ? (
                               <Button size="sm" disabled={isLoadingAction} onClick={() => handleCompletePrompt(task.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                 Complete
                               </Button>
                            ) : null)}
                            {isManagerOrAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="sm:opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground ml-2 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(task)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit {isTemplate ? 'Template' : 'Task'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete {isTemplate ? 'Template' : 'Task'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/10">
                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No tasks found</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  {filter === 'templates' ? 'No daily templates defined yet.' : "No tasks match the selected status."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateTask}>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Add a new task or daily template.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title <span className="text-rose-500">*</span></Label>
                  <Input id="title" placeholder="e.g. Restock Inventory" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newTaskPriority} onValueChange={(v: TaskPriority) => setNewTaskPriority(v)}>
                      <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={newTaskLocationId} onValueChange={(v) => setNewTaskLocationId(v)}>
                      <SelectTrigger><SelectValue placeholder="No location" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">No location</SelectItem>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Link QR Form (Optional)</Label>
                  <Select value={newTaskLinkedFormId} onValueChange={(v) => setNewTaskLinkedFormId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select a form" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">No form linked</SelectItem>{qrForms.map(f => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Require employees to fill out a specific form to complete this task.</p>
                </div>
                <div className="space-y-2">
                  <Label>Assign To (Optional)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/10 space-y-1">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox checked={newTaskAssignees.includes(user.id)} onCheckedChange={(checked) => {
                            if (checked) setNewTaskAssignees(prev => [...prev, user.id]);
                            else setNewTaskAssignees(prev => prev.filter(id => id !== user.id));
                        }} />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input id="description" placeholder="Brief details about what needs to be done" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Checklist (Optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewTaskChecklist([...newTaskChecklist, { id: crypto.randomUUID(), text: '', completed: false }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Item
                    </Button>
                  </div>
                  {newTaskChecklist.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        value={item.text}
                        onChange={e => { const newList = [...newTaskChecklist]; newList[idx].text = e.target.value; setNewTaskChecklist(newList); }}
                        placeholder="Checklist item description"
                        className="flex-1 h-9"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setNewTaskChecklist(newTaskChecklist.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                {isManagerOrAdmin && (
                  <div className="flex items-center space-x-3 border-t pt-4 mt-2">
                    <Checkbox id="isDaily" checked={newTaskIsDaily} onCheckedChange={(c) => setNewTaskIsDaily(!!c)} />
                    <label htmlFor="isDaily" className="text-sm font-medium leading-none cursor-pointer">
                      Make this a Daily Template
                      <p className="text-xs text-muted-foreground mt-1 font-normal">A new task will automatically be generated every day.</p>
                    </label>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating || !newTaskTitle.trim()}>{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{newTaskIsDaily ? 'Create Template' : 'Create Task'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={!!taskToEdit} onOpenChange={(open) => !open && setTaskToEdit(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>Update the details of this item.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Task Title <span className="text-rose-500">*</span></Label>
                  <Input id="edit-title" value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={editTaskPriority} onValueChange={(v: TaskPriority) => setEditTaskPriority(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={editTaskLocationId} onValueChange={(v) => setEditTaskLocationId(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="none">No location</SelectItem>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Link QR Form</Label>
                  <Select value={editTaskLinkedFormId} onValueChange={(v) => setEditTaskLinkedFormId(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">No form linked</SelectItem>{qrForms.map(f => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/10 space-y-1">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox checked={editTaskAssignees.includes(user.id)} onCheckedChange={(checked) => {
                            if (checked) setEditTaskAssignees(prev => [...prev, user.id]);
                            else setEditTaskAssignees(prev => prev.filter(id => id !== user.id));
                        }} />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input id="edit-description" value={editTaskDesc} onChange={(e) => setEditTaskDesc(e.target.value)} />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Checklist (Optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditTaskChecklist([...editTaskChecklist, { id: crypto.randomUUID(), text: '', completed: false }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Item
                    </Button>
                  </div>
                  {editTaskChecklist.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        value={item.text}
                        onChange={e => { const newList = [...editTaskChecklist]; newList[idx].text = e.target.value; setEditTaskChecklist(newList); }}
                        placeholder="Checklist item description"
                        className="flex-1 h-9"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditTaskChecklist(editTaskChecklist.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                {isManagerOrAdmin && (
                  <div className="flex items-center space-x-3 border-t pt-4 mt-2">
                    <Checkbox id="editIsDaily" checked={editTaskIsDaily} onCheckedChange={(c) => setEditTaskIsDaily(!!c)} />
                    <label htmlFor="editIsDaily" className="text-sm font-medium leading-none cursor-pointer">Daily Template</label>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTaskToEdit(null)}>Cancel</Button>
                <Button type="submit" disabled={isEditing || !editTaskTitle.trim()}>{isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={!!completingTaskId} onOpenChange={(open) => !open && setCompletingTaskId(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Complete Task</DialogTitle>
              <DialogDescription>Mark this task as completed. Attach an optional photo as proof.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="mb-2 block">Photo Proof</Label>
              {taskPhoto ? (
                <div className="relative h-48 w-full rounded-xl overflow-hidden border">
                  <img src={taskPhoto} alt="Preview" className="h-full w-full object-cover" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setTaskPhoto(null)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold">Tap to take photo</span> or upload</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
                  </label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompletingTaskId(null)}>Cancel</Button>
              <Button onClick={handleConfirmComplete} disabled={!!isProcessingAction} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Complete Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={!!fillingTask} onOpenChange={(open) => !open && setFillingTask(null)}>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col overflow-hidden">
            {fillingTask && (() => {
               const form = qrForms.find(f => f.id === fillingTask.linkedFormId);
               if (!form) return <div className="p-4 text-center text-muted-foreground">Form data unavailable.</div>;
               return (
                 <form onSubmit={handleFormSubmit} className="flex flex-col h-full overflow-hidden">
                   <DialogHeader className="shrink-0 pb-4 border-b">
                     <DialogTitle className="flex items-center gap-2 text-xl"><FileSignature className="h-5 w-5 text-blue-500" />{form.title}</DialogTitle>
                     {form.description && <DialogDescription>{form.description}</DialogDescription>}
                   </DialogHeader>
                   <div className="flex-1 overflow-y-auto py-6 px-1 space-y-6">
                     {formValidationError && (
                       <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                         <AlertTriangle className="h-4 w-4 shrink-0" /><p>{formValidationError}</p>
                       </div>
                     )}
                     {form.fields.map((field) => (
                       <div key={field.id} className="space-y-2.5">
                         {field.type !== 'checkbox' && (
                           <Label htmlFor={field.id} className="text-base flex items-center">{field.label}{field.required && <span className="text-rose-500 ml-1.5">*</span>}</Label>
                         )}
                         {renderField(field)}
                       </div>
                     ))}
                   </div>
                   <DialogFooter className="shrink-0 pt-4 border-t">
                     <Button type="button" variant="outline" onClick={() => setFillingTask(null)}>Cancel</Button>
                     <Button type="submit" disabled={formSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                       {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit & Complete Task
                     </Button>
                   </DialogFooter>
                 </form>
               );
            })()}
          </DialogContent>
        </Dialog>
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-1 flex flex-col bg-black/95 border-none">
            <DialogHeader className="sr-only"><DialogTitle>Viewer</DialogTitle></DialogHeader>
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
              {selectedImage && <img src={selectedImage} alt="Full screen" className="max-w-full max-h-full object-contain" />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}