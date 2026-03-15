import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, ScanFace, Trash2, Plus, Key } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api-client';
import type { User, UserRole, ShiftRole } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
}
export function EditProfileModal({ isOpen, onClose, userToEdit }: EditProfileModalProps) {
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);
  const updateCurrentUser = useAuthStore(s => s.updateCurrentUser);
  const updateUserLocal = useDataStore(s => s.updateUserLocal);
  const workSites = useDataStore(s => s.workSites);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyContact2, setEmergencyContact2] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [faceIdPhotoUrl, setFaceIdPhotoUrl] = useState('');
  const [shiftRoles, setShiftRoles] = useState<ShiftRole[]>([]);
  const [assignedWorkSiteIds, setAssignedWorkSiteIds] = useState<string[]>([]);
  const [disableGeofenceReminders, setDisableGeofenceReminders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastInitializedUserId = useRef<string | null>(null);
  useEffect(() => {
    if (userToEdit && isOpen && lastInitializedUserId.current !== userToEdit.id) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email || '');
      setPassword(''); // Password never prefills, only set for override
      setPinCode(userToEdit.pinCode || '');
      setPhoneNumber(userToEdit.phoneNumber || '');
      setEmergencyContact(userToEdit.emergencyContact || '');
      setEmergencyContact2(userToEdit.emergencyContact2 || '');
      setRole(userToEdit.role || 'employee');
      setAvatarUrl(userToEdit.avatarUrl || '');
      setFaceIdPhotoUrl(userToEdit.faceIdPhotoUrl || '');
      setShiftRoles(userToEdit.shiftRoles || []);
      setAssignedWorkSiteIds(userToEdit.assignedWorkSiteIds || []);
      setDisableGeofenceReminders(userToEdit.disableGeofenceReminders || false);
      setIsCameraActive(false);
      setCameraError(null);
      lastInitializedUserId.current = userToEdit.id;
    }
    if (!isOpen) {
      lastInitializedUserId.current = null;
      stopCamera();
    }
  }, [userToEdit, isOpen]);
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const canEditRole = isManagerOrAdmin;
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera API not supported in this browser");
      toast.error("Camera API not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError("Camera access denied.");
      toast.error("Could not access camera. Please check permissions.");
    }
  };
  const capturePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg');
        setFaceIdPhotoUrl(imageSrc);
        stopCamera();
      }
    }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setIsSaving(true);
    try {
      const updates: Partial<User> = {
        name,
        email,
        phoneNumber,
        emergencyContact,
        emergencyContact2,
        avatarUrl,
        faceIdPhotoUrl,
      };
      if (canEditRole) {
        updates.role = role;
        updates.shiftRoles = shiftRoles;
        updates.assignedWorkSiteIds = assignedWorkSiteIds;
        updates.disableGeofenceReminders = disableGeofenceReminders;
        updates.pinCode = pinCode;
        if (password.trim()) {
           updates.password = password.trim();
        }
      } else if (password.trim() && userToEdit.id === currentUserId) {
         // Allow users to reset their own password
         updates.password = password.trim();
      }
      const updatedUser = await api<User>(`/api/users/${userToEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      updateUserLocal(updatedUser.id, updatedUser);
      if (currentUserId === updatedUser.id) {
        updateCurrentUser(updatedUser);
      }
      toast.success('Profile updated successfully');
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  if (!userToEdit) return null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update {userToEdit.id === currentUserId ? 'your' : 'employee'} profile details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-rose-500">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address <span className="text-rose-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 p-3 bg-muted/20 border border-border/50 rounded-lg">
              <Label htmlFor="password" className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Set New Password</Label>
              <Input
                id="password"
                type="text"
                placeholder="Leave blank to keep unchanged"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Changes are saved immediately upon confirmation.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +1 555-0123"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency">Primary Emergency Contact</Label>
                  <Input
                    id="emergency"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Name & Phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency2">Secondary Emergency Contact</Label>
                  <Input
                    id="emergency2"
                    value={emergencyContact2}
                    onChange={(e) => setEmergencyContact2(e.target.value)}
                    placeholder="Name & Phone"
                  />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Profile Photo URL</Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-3 border-t pt-4">
              <Label>Face ID Verification Photo</Label>
              {faceIdPhotoUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={faceIdPhotoUrl} alt="Face ID" className="w-32 h-32 object-cover rounded-xl border-2" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setFaceIdPhotoUrl(''); startCamera(); }}>
                    Retake Photo
                  </Button>
                </div>
              ) : isCameraActive ? (
                <div className="flex flex-col items-center gap-3">
                  {cameraError ? (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{cameraError}</div>
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-48 h-48 object-cover rounded-xl bg-black border-2" />
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={stopCamera}>Cancel</Button>
                    <Button type="button" size="sm" onClick={capturePhoto} disabled={!!cameraError}>
                      <Camera className="w-4 h-4 mr-2" /> Capture
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center p-6 border-2 border-dashed rounded-xl gap-3 bg-muted/20">
                  <ScanFace className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">Capture a dedicated biometric photo for Face ID clock-ins.</p>
                  <Button type="button" variant="secondary" size="sm" onClick={startCamera}>
                    Start Camera
                  </Button>
                </div>
              )}
            </div>
            {canEditRole && (
              <>
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="role">System Role</Label>
                  <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="pinCode">4-Digit PIN Code</Label>
                  <Input
                    id="pinCode"
                    type="text"
                    maxLength={4}
                    pattern="[0-9]*"
                    placeholder="e.g. 1234"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Used for alternative secure clock-ins at the Shared Kiosk.</p>
                </div>
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Shift Roles & Pay Rates</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShiftRoles([...shiftRoles, { id: crypto.randomUUID(), title: '' }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Role
                    </Button>
                  </div>
                  {shiftRoles.map((shiftRole, idx) => (
                    <div key={shiftRole.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Role Title"
                        value={shiftRole.title}
                        onChange={e => {
                          const newRoles = [...shiftRoles];
                          newRoles[idx].title = e.target.value;
                          setShiftRoles(newRoles);
                        }}
                        className="flex-1"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          placeholder="Rate"
                          className="pl-6"
                          value={shiftRole.payRate || ''}
                          onChange={e => {
                            const newRoles = [...shiftRoles];
                            newRoles[idx].payRate = parseFloat(e.target.value) || undefined;
                            setShiftRoles(newRoles);
                          }}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShiftRoles(shiftRoles.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 border-t pt-4">
                  <Label>Assigned Work Sites (Geofencing)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/10 space-y-1">
                    {workSites.map(site => (
                      <label key={site.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox
                          checked={assignedWorkSiteIds.includes(site.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAssignedWorkSiteIds(prev => [...prev, site.id]);
                            } else {
                              setAssignedWorkSiteIds(prev => prev.filter(id => id !== site.id));
                            }
                          }}
                        />
                        <span className="text-sm font-medium">{site.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{site.siteCode}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-start space-x-2 mt-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-800/30">
                    <Checkbox
                      id="disableGeofence"
                      checked={disableGeofenceReminders}
                      onCheckedChange={(c) => setDisableGeofenceReminders(!!c)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1 leading-none">
                      <label htmlFor="disableGeofence" className="text-sm font-medium cursor-pointer text-amber-800 dark:text-amber-400">
                        Disable Geofenced Reminders
                      </label>
                      <p className="text-xs text-amber-700/80 dark:text-amber-500/80">Turn off automated location-based clock-in prompts for this specific user.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim() || !email.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}