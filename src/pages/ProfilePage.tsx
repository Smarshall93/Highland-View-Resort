import React, { useState } from 'react';
import { UserCircle, Mail, Phone, HeartPulse, Briefcase, Edit, Shield, ScanFace, MapPin } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { EditProfileModal } from '@/components/EditProfileModal';
export function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Selector for primitives to follow Zustand v5 best practices
  const userId = useAuthStore(s => s.user?.id);
  const userName = useAuthStore(s => s.user?.name);
  const userRole = useAuthStore(s => s.user?.role);
  const userEmail = useAuthStore(s => s.user?.email);
  const userAvatarUrl = useAuthStore(s => s.user?.avatarUrl);
  const userEmailVerified = useAuthStore(s => s.user?.emailVerified);  const userFaceIdPhotoUrl = useAuthStore(s => s.user?.faceIdPhotoUrl);
  const userPhoneNumber = useAuthStore(s => s.user?.phoneNumber);
  const userEmergencyContact = useAuthStore(s => s.user?.emergencyContact);
  const userEmergencyContact2 = useAuthStore(s => s.user?.emergencyContact2);
  const userDisableGeofenceReminders = useAuthStore(s => s.user?.disableGeofenceReminders);
  if (!user || !userId || !userName) return null;
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  };
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCircle className="h-8 w-8 text-primary" />
              My Profile
            </h1>
            <p className="text-muted-foreground mt-1">Manage your personal information and account settings.</p>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)} className="shadow-sm">
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-t-4 border-t-primary shadow-sm h-fit">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="h-32 w-32 rounded-full border-4 border-background bg-secondary flex items-center justify-center overflow-hidden shadow-lg mb-4">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-muted-foreground">{getInitials(userName)}</span>
                )}
              </div>
              <h2 className="text-2xl font-bold">{userName}</h2>
              <Badge variant="outline" className="mt-2 capitalize bg-primary/5 text-primary">
                {userRole}
              </Badge>
              <div className="mt-6 w-full space-y-3 border-t pt-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Status</span>
                  {userEmailVerified ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">Verified</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Pending Verification</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><ScanFace className="h-4 w-4" /> Face ID</span>
                  {userFaceIdPhotoUrl ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">Enrolled</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Not Enrolled</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Geofence Prompts</span>
                  {userDisableGeofenceReminders ? (
                    <span className="text-muted-foreground font-medium flex items-center gap-1">Disabled</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Active</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> User ID</span>
                  <span className="font-mono">{userId.split('-')[0]}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Details used for communications and emergencies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                    <Mail className="h-4 w-4" /> Email Address
                  </div>
                  <p className="font-medium text-foreground">{userEmail || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                    <Phone className="h-4 w-4" /> Phone Number
                  </div>
                  <p className="font-medium text-foreground">{userPhoneNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="border-t pt-6 grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-500" /> Primary Emergency Contact
                  </div>
                  {userEmergencyContact ? (
                    <p className="font-medium text-foreground">{userEmergencyContact}</p>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">No primary contact provided.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-400 opacity-80" /> Secondary Emergency Contact
                  </div>
                  {userEmergencyContact2 ? (
                    <p className="font-medium text-foreground">{userEmergencyContact2}</p>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">No secondary contact provided.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userToEdit={user}
      />
    </AppLayout>
  );
}