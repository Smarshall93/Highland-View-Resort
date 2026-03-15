import React, { useState, useEffect, useMemo } from 'react';
import { format, parse } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Clock, Calendar } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api-client';
import type { TimeEntry, TimeEntryType } from '@shared/types';
import { useDataStore } from '@/store/dataStore';
interface DailyTimeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  dateStr: string; // 'yyyy-MM-dd' format
}
type EditableEntry = {
  isNew: boolean;
  id?: string;
  type: TimeEntryType;
  timeStr: string; // 'HH:mm'
  timestamp?: number;
  isDeleted?: boolean;
  isModified?: boolean;
};
export function DailyTimeEditorModal({ isOpen, onClose, userId, userName, dateStr }: DailyTimeEditorModalProps) {
  const timeEntries = useDataStore(s => s.timeEntries);
  const addTimeEntryLocal = useDataStore(s => s.addTimeEntryLocal);
  const updateTimeEntryLocal = useDataStore(s => s.updateTimeEntryLocal);
  const deleteTimeEntryLocal = useDataStore(s => s.deleteTimeEntryLocal);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (isOpen && userId && dateStr) {
      // Find entries for this user on this specific date
      const dayEntries = timeEntries
        .filter(e => e.userId === userId && format(new Date(e.timestamp), 'yyyy-MM-dd') === dateStr)
        .sort((a, b) => a.timestamp - b.timestamp);
      setEntries(
        dayEntries.map(e => ({
          isNew: false,
          id: e.id,
          type: e.type,
          timeStr: format(new Date(e.timestamp), 'HH:mm'),
          timestamp: e.timestamp
        }))
      );
    }
  }, [isOpen, userId, dateStr, timeEntries]);
  const handleAddPunch = () => {
    setEntries([
      ...entries,
      { isNew: true, type: 'clock_in', timeStr: '09:00' }
    ]);
  };
  const handleUpdateEntry = (index: number, updates: Partial<EditableEntry>) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], ...updates, isModified: true };
    setEntries(newEntries);
  };
  const handleDeleteEntry = (index: number) => {
    const newEntries = [...entries];
    if (newEntries[index].isNew) {
      newEntries.splice(index, 1);
    } else {
      newEntries[index].isDeleted = true;
    }
    setEntries(newEntries);
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = entries.map(async (entry) => {
        if (entry.isDeleted && entry.id) {
          // Delete
          deleteTimeEntryLocal(entry.id);
          await api(`/api/time-entries/${entry.id}`, { method: 'DELETE' });
        } else if (entry.isNew && !entry.isDeleted) {
          // Create
          const parsedDate = parse(`${dateStr} ${entry.timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
          const newEntryData = {
            userId,
            type: entry.type,
            timestamp: parsedDate.getTime(),
            status: 'verified',
            verificationMethod: 'pin',
            deviceType: 'desktop'
          };
          const created = await api<TimeEntry>('/api/time-entries', {
            method: 'POST',
            body: JSON.stringify(newEntryData)
          });
          addTimeEntryLocal(created);
        } else if (!entry.isNew && !entry.isDeleted && entry.isModified && entry.id) {
          // Update
          const parsedDate = parse(`${dateStr} ${entry.timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
          const updates = {
            type: entry.type,
            timestamp: parsedDate.getTime()
          };
          updateTimeEntryLocal(entry.id, updates);
          await api(`/api/time-entries/${entry.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
          });
        }
      });
      await Promise.all(promises);
      toast.success('Timesheet updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to update timesheet:', error);
      toast.error('Failed to update timesheet');
    } finally {
      setIsSaving(false);
    }
  };
  const activeEntries = entries.filter(e => !e.isDeleted);
  const displayDate = dateStr ? format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM do, yyyy') : '';
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Edit Timesheet
          </DialogTitle>
          <DialogDescription className="mt-1 flex flex-col gap-1">
            <span className="font-medium text-foreground">{userName}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {displayDate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4 min-h-[250px]">
          {activeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No time punches for this day.</p>
              <p className="text-xs mt-1">Click "Add Punch" to create a manual entry.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeEntries.map((entry, idx) => {
                const globalIndex = entries.indexOf(entry);
                return (
                  <div key={globalIndex} className="flex items-center gap-3 p-3 bg-muted/20 border rounded-lg shadow-sm">
                    <div className="flex-1">
                      <Select 
                        value={entry.type} 
                        onValueChange={(val: TimeEntryType) => handleUpdateEntry(globalIndex, { type: val })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clock_in">Clock In</SelectItem>
                          <SelectItem value="break_start">Break Start</SelectItem>
                          <SelectItem value="break_end">Break End</SelectItem>
                          <SelectItem value="clock_out">Clock Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="time"
                        value={entry.timeStr}
                        onChange={(e) => handleUpdateEntry(globalIndex, { timeStr: e.target.value })}
                        className="h-9"
                        required
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteEntry(globalIndex)}
                      className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddPunch}
            className="w-full mt-4 border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Punch
          </Button>
        </div>
        <DialogFooter className="shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}