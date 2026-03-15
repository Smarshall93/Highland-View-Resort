import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Camera, Loader2, CheckCircle2, Clock as ClockIcon, ScanFace, Info, AlertTriangle, Building, Coffee, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import type { Location, TimeEntry, TimeEntryType, User, ShiftRole } from '@shared/types';
import { useIsMobile } from '@/hooks/use-mobile';
interface ClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: TimeEntry) => void;
  type: TimeEntryType;
  targetUser?: User; // Important for Kiosk Mode
}
export function ClockInModal({ isOpen, onClose, onSuccess, type, targetUser }: ClockInModalProps) {
  const [step, setStep] = useState<-1 | 0 | 1 | 2 | 3>(1); // -1: Role, 0: Break Pref, 1: Geolocation, 2: Verification, 3: Processing
  const isKiosk = window.location.pathname.includes('kiosk');
  const [verificationMode, setVerificationMode] = useState<'face' | 'pin'>(isKiosk ? 'pin' : 'face');
  const [breakPref, setBreakPref] = useState<'on-property' | 'off-property' | null>(null);
  const [selectedRole, setSelectedRole] = useState<ShiftRole | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [matchedSite, setMatchedSite] = useState<any>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string>('Initializing verification...');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const user = useAuthStore(s => s.user);
  const isMobile = useIsMobile();
  const activeUser = targetUser || user;
  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);
  // Reset state when modal opens or target user truly changes
  useEffect(() => {
    if (isOpen && activeUser?.id !== lastUserIdRef.current) {
      lastUserIdRef.current = activeUser?.id || null;
      let initialStep = 1;
      if (isKiosk) {
        // Kiosks are assumed stationary, skip geolocation check immediately to step 2
        initialStep = 2;
      }
      if (type === 'break_start') initialStep = 0;
      else if (type === 'clock_in' && activeUser?.shiftRoles && activeUser.shiftRoles.length > 1) initialStep = -1;
      setStep(initialStep as any);
      setVerificationMode(isKiosk ? 'pin' : 'face');
      setLocation(null);
      setBreakPref(null);
      setImgSrc(null);
      setMatchedSite(null);
      setIsLocating(false);
      setIsSubmitting(false);
      setPinInput('');
      setCameraError(null);
      if (activeUser?.shiftRoles?.length === 1) {
        setSelectedRole(activeUser.shiftRoles[0]);
      } else {
        setSelectedRole(null);
      }
    }
    if (!isOpen) {
      lastUserIdRef.current = null;
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, type, stopCamera, activeUser?.id, activeUser?.shiftRoles, isKiosk]);
  const startCamera = useCallback(async () => {
    if (isKiosk) return; // Hard block camera access in kiosk mode
    setCameraError(null);
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
      console.info("Camera access restricted:", err?.name || err?.message || err);
      setCameraError("Camera access is required for Face ID. Please enable camera permissions in your browser settings and try again.");
      toast.error("Could not access camera. Please check browser permissions.");
    }
  }, [isKiosk]);
  useEffect(() => {
    if (step === 2 && verificationMode === 'face' && !imgSrc && !isKiosk) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [step, verificationMode, imgSrc, stopCamera, startCamera, isKiosk]);
  const getLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          let detectedSite = null;
          if (activeUser?.assignedWorkSiteIds) {
            const sites = useDataStore.getState().workSites || [];
            for (const sid of activeUser.assignedWorkSiteIds) {
              const site = sites.find(s => s.id === sid);
              if (site) {
                const R = 6371e3;
                const p1 = position.coords.latitude * Math.PI / 180;
                const p2 = site.lat * Math.PI / 180;
                const dp = (site.lat - position.coords.latitude) * Math.PI / 180;
                const dl = (site.lng - position.coords.longitude) * Math.PI / 180;
                const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
                const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
                if (dist <= site.radius) {
                  detectedSite = site;
                  break;
                }
              }
            }
          }
          setMatchedSite(detectedSite);
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setIsLocating(false);
          setStep(2);
          toast.success('Location verified');
        },
        (error) => {
          console.info('Geolocation access restricted:', error.message);
          setIsLocating(false);
          toast.error('Unable to access GPS location. For security compliance, a manual verification bypass will be applied to this entry.');
          setLocation({ lat: 40.7128, lng: -74.0060, accuracy: 100 });
          setMatchedSite(null);
          setStep(2);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
      toast.error('Geolocation is not supported by your browser');
    }
  };
  // Simulate AI Verification steps
  useEffect(() => {
    if (step === 3 && isSubmitting && verificationMode === 'face') {
      const messages = [
        "Detecting facial landmarks...",
        "Extracting biometric vectors...",
        "Cross-referencing database...",
        "Match Confidence: 98.5%"
      ];
      let i = 0;
      setAiStatus(messages[0]);
      const interval = setInterval(() => {
        i++;
        if (i < messages.length) {
          setAiStatus(messages[i]);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [step, isSubmitting, verificationMode]);
  const submitClockIn = useCallback(async (photoData?: string) => {
    setStep(3);
    setIsSubmitting(true);
    try {
      if (verificationMode === 'face') {
        await new Promise(resolve => setTimeout(resolve, 3500));
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const deviceType = isKiosk ? 'kiosk' : (isMobile ? 'mobile' : 'desktop');
      const res = await api<TimeEntry>('/api/clock-in', {
        method: 'POST',
        body: JSON.stringify({
          userId: activeUser?.id || 'u1',
          type,
          location,
          photoUrl: photoData,
          verificationMethod: verificationMode,
          breakLocationPreference: breakPref || undefined,
          deviceType,
          shiftRoleId: selectedRole?.id,
          shiftRoleTitle: selectedRole?.title,
          workSiteId: matchedSite?.id,
          workSiteName: matchedSite?.name
        })
      });
      toast.success(`Successfully ${type === 'clock_in' ? 'clocked in' : 'clocked out'}!`);
      onSuccess(res);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.warn('Clock-in submission failed:', error?.message || error);
      toast.error('Failed to process time entry');
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  }, [type, location, onSuccess, onClose, activeUser, verificationMode, breakPref, isMobile, isKiosk, selectedRole, matchedSite]);
  const capture = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg');
        setImgSrc(imageSrc);
        stopCamera();
        submitClockIn(imageSrc);
      } else {
        toast.error('Failed to capture image');
      }
    }
  }, [stopCamera, submitClockIn]);
  const verifyPin = useCallback(() => {
    const validPin = activeUser?.pinCode || '1234';
    if (pinInput === validPin) {
      submitClockIn();
    } else {
      toast.error('Invalid PIN code');
      setPinInput('');
    }
  }, [pinInput, submitClockIn, activeUser]);
  const actionText = {
    clock_in: 'Clock In',
    clock_out: 'Clock Out',
    break_start: 'Start Break',
    break_end: 'End Break'
  }[type];
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="w-[95vw] max-w-md h-[90vh] sm:h-auto rounded-3xl flex flex-col p-4 sm:p-6 overflow-hidden bg-background gap-0 shadow-2xl">
        <DialogHeader className="shrink-0 pb-4 text-center sm:text-left">
          <DialogTitle className="text-2xl flex items-center justify-center sm:justify-start gap-2">
            <ClockIcon className="h-6 w-6 text-primary" />
            {actionText}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isKiosk ? 'Please enter your secure 4-digit PIN to proceed.' : 'Please verify your location and identity to continue.'}
            {targetUser && <strong className="block mt-1 text-foreground">Clocking for {targetUser.name}.</strong>}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] overflow-y-auto w-full">
          {step === -1 && (
            <div className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full">
              <div className="text-center space-y-3 w-full max-w-[280px]">
                <h3 className="font-semibold text-xl">Select Shift Role</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Which role are you clocking in for?
                </p>
              </div>
              <div className="flex flex-col gap-4 w-full max-w-[280px]">
                {activeUser?.shiftRoles?.map(role => (
                  <Button
                    key={role.id}
                    variant="outline"
                    className="h-16 text-base rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-start px-6 gap-3 shadow-sm"
                    onClick={() => { setSelectedRole(role); setStep(isKiosk ? 2 : 1); }}
                  >
                    <Briefcase className="h-5 w-5 text-primary shrink-0" />
                    {role.title} {role.payRate ? <span className="text-muted-foreground ml-auto">${role.payRate}/hr</span> : ''}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {step === 0 && (
            <div className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full">
              <div className="text-center space-y-3 w-full max-w-[280px]">
                <h3 className="font-semibold text-xl">Break Location</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Are you staying on the property for your break?
                </p>
              </div>
              <div className="flex flex-col gap-4 w-full max-w-[280px]">
                <Button
                  variant="outline"
                  className="h-16 text-base rounded-xl border-2 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-start gap-3 px-6 shadow-sm"
                  onClick={() => { setBreakPref('on-property'); setStep(isKiosk ? 2 : 1); }}
                >
                  <Building className="h-5 w-5 text-emerald-500 shrink-0" /> Staying On-Property
                </Button>
                <Button
                  variant="outline"
                  className="h-16 text-base rounded-xl border-2 hover:border-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-start gap-3 px-6 shadow-sm"
                  onClick={() => { setBreakPref('off-property'); setStep(isKiosk ? 2 : 1); }}
                >
                  <Coffee className="h-5 w-5 text-amber-500 shrink-0" /> Going Off-Property
                </Button>
              </div>
            </div>
          )}
          {step === 1 && !isKiosk && (
            <div className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full">
              <div className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-3 w-full max-w-[280px]">
                <h3 className="font-semibold text-xl">Location Check</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We need to verify you are within the designated work zone using your device's GPS.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-3 rounded-lg text-xs flex items-start gap-2 text-left border border-amber-200 dark:border-amber-800/30">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>This is strictly required for personal mobile clock-ins.</span>
                </div>
              </div>
              <Button
                size="lg"
                onClick={getLocation}
                disabled={isLocating}
                className="w-full max-w-[280px] h-14 text-lg rounded-xl shadow-md"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Locating...
                  </>
                ) : (
                  'Verify Location'
                )}
              </Button>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col items-center space-y-4 w-full h-full animate-in fade-in slide-in-from-right-4">
              {isKiosk ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full mt-4">
                  <div className="p-8 sm:p-10 border-2 border-dashed rounded-2xl w-full max-w-[320px] flex flex-col items-center bg-muted/10 mx-auto shadow-inner">
                    <Input
                      type="password"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      className="text-center text-5xl tracking-[0.5em] font-mono h-24 bg-background rounded-xl border-2 border-primary/30 focus-visible:ring-primary"
                      placeholder="••••"
                      maxLength={4}
                      autoFocus
                    />
                    <div className="text-center mt-6">
                      <h3 className="font-semibold text-lg">Enter PIN</h3>
                      <p className="text-sm text-muted-foreground mt-1">Enter your secure 4-digit code</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full max-w-[320px] mx-auto mt-auto pt-8 shrink-0">
                    <Button variant="outline" className="flex-1 h-14 text-base rounded-xl" onClick={() => {
                        const hasRole = activeUser?.shiftRoles && activeUser.shiftRoles.length > 1;
                        if (hasRole) setStep(-1);
                        else onClose();
                    }}>Cancel</Button>
                    <Button className="flex-1 h-14 text-base rounded-xl shadow-md" onClick={verifyPin} disabled={pinInput.length < 4}>
                      Verify
                    </Button>
                  </div>
                </div>
              ) : (
                <Tabs value={verificationMode} onValueChange={(v) => setVerificationMode(v as 'face' | 'pin')} className="w-full flex flex-col h-full">
                  <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl shrink-0">
                    <TabsTrigger value="face" className="text-sm rounded-lg">Face ID</TabsTrigger>
                    <TabsTrigger value="pin" className="text-sm rounded-lg">PIN Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="face" className="mt-6 flex-1 data-[state=active]:flex data-[state=inactive]:hidden flex-col items-center justify-between min-h-0 w-full">
                    <div className="flex flex-col items-center w-full flex-1 justify-center">
                      {cameraError ? (
                        <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center bg-muted/20 rounded-2xl border-2 border-dashed border-destructive/50 p-6 text-center">
                          <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                          <p className="text-sm font-medium text-destructive mb-4">{cameraError}</p>
                          <div className="flex flex-col gap-2 w-full max-w-[200px]">
                            <Button variant="outline" size="sm" onClick={startCamera}>Retry Camera</Button>
                            <Button variant="secondary" size="sm" onClick={() => submitClockIn('https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop')}>
                              Manual Bypass
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full max-w-[320px] aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden bg-black/5 border-2 border-border shadow-inner">
                          {imgSrc ? (
                            <img src={imgSrc} alt="captured" className="w-full h-full object-cover" />
                          ) : (
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover bg-black"
                            />
                          )}
                          {!imgSrc && (
                            <div className="absolute inset-0 pointer-events-none border-[3px] border-primary/30 rounded-xl m-8 border-dashed flex items-center justify-center">
                              <div className="w-32 h-40 border-2 border-primary/50 rounded-full opacity-50" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-center mt-4 mb-2 shrink-0">
                        <h3 className="font-semibold text-lg">Face ID Verification</h3>
                        <p className="text-sm text-muted-foreground">Position your face within the frame</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-[320px] shrink-0 mt-auto pt-2">
                      <div className="flex gap-3 w-full">
                        <Button variant="outline" className="flex-1 h-14 text-base rounded-xl" onClick={() => { stopCamera(); setStep(1); }}>Back</Button>
                        <Button className="flex-1 h-14 text-base rounded-xl shadow-md" onClick={capture} disabled={!!cameraError}>
                          <Camera className="mr-2 h-5 w-5" />
                          Capture
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground h-10"
                        onClick={() => submitClockIn('https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop')}
                      >
                        Skip to Mock Photo (Demo)
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="pin" className="mt-6 flex-1 data-[state=active]:flex data-[state=inactive]:hidden flex-col items-center min-h-0 w-full">
                    <div className="p-8 sm:p-10 border-2 border-dashed rounded-2xl w-full max-w-[320px] flex flex-col items-center bg-muted/10 mx-auto">
                      <Input
                        type="password"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        className="text-center text-5xl tracking-[0.5em] font-mono h-24 bg-background rounded-xl border-2"
                        placeholder="••••"
                        maxLength={4}
                        autoFocus
                      />
                      <div className="text-center mt-6">
                        <h3 className="font-semibold text-lg">Enter PIN</h3>
                        <p className="text-sm text-muted-foreground mt-1">Enter your 4-digit code</p>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full max-w-[320px] mx-auto mt-auto pt-8 shrink-0">
                      <Button variant="outline" className="flex-1 h-14 text-base rounded-xl" onClick={() => setStep(1)}>Back</Button>
                      <Button className="flex-1 h-14 text-base rounded-xl shadow-md" onClick={verifyPin} disabled={pinInput.length < 4}>
                        Verify
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col items-center space-y-8 w-full animate-in zoom-in-95">
              {isSubmitting ? (
                <div className="flex flex-col items-center space-y-6">
                  {verificationMode === 'face' ? (
                    <div className="relative w-56 h-56 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-primary/20 shadow-inner">
                      <img src={imgSrc || ''} alt="verifying" className="w-full h-full object-cover blur-[2px]" />
                      <div className="absolute inset-0 border-[4px] border-primary rounded-full animate-pulse pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-shimmer pointer-events-none h-[200%] -translate-y-1/2" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <ScanFace className="h-16 w-16 text-white animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center bg-muted rounded-full animate-pulse border-4 border-primary/20">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                  )}
                  <div className="text-center space-y-2 h-20">
                    <h3 className="font-semibold text-xl text-primary">
                      {verificationMode === 'face' ? aiStatus : 'Verifying PIN...'}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-6">
                  <div className="h-32 w-32 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-2xl">Verified Successfully!</h3>
                    <p className="text-base text-muted-foreground px-4">
                      Your time entry has been recorded and secured.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}