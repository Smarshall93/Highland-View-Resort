import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, ClipboardList, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api-client';
import type { Task, TaskPriority, TaskStatus } from '@shared/types';
import { useDataStore } from '@/store/dataStore';
import { Badge } from '@/components/ui/badge';
interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}
export function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const updateTaskLocal = useDataStore(s => s.updateTaskLocal);
  const deleteTaskLocal = useDataStore(s => s.deleteTaskLocal);
  const users = useDataStore(s => s.users);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'pending');
      setSelectedAssignee(task.assignees?.[0] || 'none');
    }
  }, [task, isOpen]);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setIsSaving(true);
    try {
      const updates: Partial<Task> = {
        title,
        description,
        priority,
        status,
        assignees: selectedAssignee === 'none' ? [] : [selectedAssignee]
      };
      const updated = await api<Task>(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      updateTaskLocal(task.id, updated);
      toast.success('Operational duty updated');
      onClose();
    } catch (err: any) {
      toast.error('Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!task || !window.confirm("Permanently remove this operational duty?")) return;
    setIsDeleting(true);
    try {
      await api(`/api/tasks/${task.id}`, { method: 'DELETE' });
      deleteTaskLocal(task.id);
      toast.success('Duty removed');
      onClose();
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };
  if (!task) return null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem]">
        <form onSubmit={handleSave}>
          <DialogHeader className="p-8 border-b bg-muted/30">
            <div className="flex items-center gap-3 mb-2">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <ClipboardList className="h-5 w-5" />
               </div>
               <DialogTitle className="text-2xl font-black tracking-tight">Edit Operational Duty</DialogTitle>
            </div>
            <DialogDescription className="font-medium">
              Modify requirements and assignments for this resort task.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Duty Title</Label>
              <Input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                className="h-12 rounded-xl border-2"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Description / Instructions</Label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="rounded-xl border-2 min-h-[100px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Priority Level</Label>
                <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                  <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Current Status</Label>
                <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                  <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Primary Assignee</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="h-12 rounded-xl border-2">
                   <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="none">Unassigned</SelectItem>
                   {users.map(u => (
                     <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-8 border-t bg-muted/20 flex flex-col sm:flex-row gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleDelete} 
              disabled={isSaving || isDeleting}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl h-12 font-bold"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Duty
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="rounded-xl h-12">Cancel</Button>
            <Button type="submit" disabled={isSaving || isDeleting} className="rounded-xl h-12 px-8 font-bold shadow-lg">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}