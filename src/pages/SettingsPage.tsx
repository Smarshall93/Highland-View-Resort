import React, { useState, useEffect } from 'react';
import { Settings, Shield, Clock, MapPin, Bell, Save, Loader2, Globe, Building2, ShieldAlert, Archive, CalendarClock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { GeofenceSensitivity } from '@shared/types';
export function SettingsPage() {
  const resortSettings = useDataStore(s => s.resortSettings);
  const updateResortSettings = useDataStore(s => s.updateResortSettings);
  const userRole = useAuthStore(s => s.user?.role);
  const isOwner = userRole === 'owner';
  const [isSaving, setIsSaving] = useState(false);
  // Local state for form management
  const [localSettings, setLocalSettings] = useState(resortSettings);
  useEffect(() => {
    setLocalSettings(resortSettings);
  }, [resortSettings]);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOwner) {
        toast.error("Read-Only Mode", { description: "Owners cannot modify global settings." });
        return;
    }
    setIsSaving(true);
    try {
      await updateResortSettings(localSettings);
      toast.success("Resort standards deployed");
    } catch (err) {
      toast.error("Deployment failed");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white">
              <Settings className="h-10 w-10 text-primary" />
              Resort Control Panel
            </h1>
            <p className="text-muted-foreground font-medium text-lg">Central command for operational standards and security protocols.</p>
          </div>
          {!isOwner && (
            <Button onClick={handleSave} size="lg" className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 font-black gap-2 transition-all hover:scale-105" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              Deploy Standards
            </Button>
          )}
        </div>
        {isOwner && (
            <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center gap-4 border border-slate-700 shadow-2xl">
                <ShieldAlert className="h-8 w-8 text-amber-400 shrink-0" />
                <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-widest text-amber-400">Security Access Level: Monitor Only</p>
                    <p className="text-slate-300 text-sm mt-1">As an owner, you have visibility into all operational configurations but cannot modify them. Please contact a Resort Admin for changes.</p>
                </div>
            </div>
        )}
        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="bg-muted/50 p-1.5 mb-10 h-auto flex flex-wrap gap-1 rounded-2xl border border-border/50">
            <TabsTrigger value="operations" className="px-8 py-3 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Operations</TabsTrigger>
            <TabsTrigger value="security" className="px-8 py-3 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Security</TabsTrigger>
            <TabsTrigger value="scheduling" className="px-8 py-3 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Tracking</TabsTrigger>
          </TabsList>
          <form onSubmit={handleSave} className="space-y-8">
            <TabsContent value="operations" className="space-y-8 m-0 outline-none">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-card">
                  <CardHeader className="bg-muted/30 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Identity</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-primary mt-1">Public Branding</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Property Name</Label>
                      <Input
                        value={localSettings.resortName}
                        onChange={e => setLocalSettings(prev => ({ ...prev, resortName: e.target.value }))}
                        disabled={isOwner}
                        className="h-12 rounded-xl border-2 font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">System Timezone</Label>
                      <Select
                        value={localSettings.timezone}
                        onValueChange={v => setLocalSettings(prev => ({ ...prev, timezone: v }))}
                        disabled={isOwner}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EST">Eastern Standard Time (EST)</SelectItem>
                          <SelectItem value="CST">Central Standard Time (CST)</SelectItem>
                          <SelectItem value="MST">Mountain Standard Time (MST)</SelectItem>
                          <SelectItem value="PST">Pacific Standard Time (PST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-card">
                  <CardHeader className="bg-muted/30 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                        <Archive className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Persistence</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-emerald-600 mt-1">Data Retention</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Auto-Archive Tasks (Days)</Label>
                      <Input
                        type="number"
                        value={localSettings.autoArchiveCompletedTasksDays}
                        onChange={e => setLocalSettings(prev => ({ ...prev, autoArchiveCompletedTasksDays: Number(e.target.value) }))}
                        disabled={isOwner}
                        className="h-12 rounded-xl border-2 font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground font-medium italic">Completed duties older than this will be moved to cold storage.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="security" className="space-y-8 m-0 outline-none">
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/30 border-b p-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">Biometric Standards</CardTitle>
                      <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-rose-600 mt-1">Authentication Protocols</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <Label className="text-lg font-black tracking-tight">Require Face ID Globally</Label>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">Forces a biometric camera scan for every clock-in and task completion action across the resort.</p>
                      </div>
                      <Switch
                        checked={localSettings.requireFaceIdGlobally}
                        onCheckedChange={checked => setLocalSettings(prev => ({ ...prev, requireFaceIdGlobally: checked }))}
                        disabled={isOwner}
                        className="scale-125"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <Label className="text-lg font-black tracking-tight">Allow PIN Bypass</Label>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">Allows employees to enter a 4-digit PIN if biometric verification fails multiple times.</p>
                      </div>
                      <Switch
                        checked={localSettings.allowManualPunchBypass}
                        onCheckedChange={checked => setLocalSettings(prev => ({ ...prev, allowManualPunchBypass: checked }))}
                        disabled={isOwner}
                        className="scale-125"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="scheduling" className="space-y-8 m-0 outline-none">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-card">
                  <CardHeader className="bg-muted/30 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                        <CalendarClock className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Service Window</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-amber-600 mt-1">Shift Management</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Work Day Start</Label>
                        <Input
                            type="time"
                            value={localSettings.workDayStart}
                            onChange={e => setLocalSettings(prev => ({ ...prev, workDayStart: e.target.value }))}
                            disabled={isOwner}
                            className="h-12 rounded-xl border-2 font-bold"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Work Day End</Label>
                        <Input
                            type="time"
                            value={localSettings.workDayEnd}
                            onChange={e => setLocalSettings(prev => ({ ...prev, workDayEnd: e.target.value }))}
                            disabled={isOwner}
                            className="h-12 rounded-xl border-2 font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-amber-50 dark:bg-amber-900/20 rounded-[1.5rem] border border-amber-200">
                        <div className="space-y-1 pr-6">
                          <Label className="font-black">Strict Overtime Blocking</Label>
                          <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">Prevent any unscheduled punches outside core hours.</p>
                        </div>
                        <Switch
                            checked={localSettings.strictOvertimeBlocking}
                            onCheckedChange={checked => setLocalSettings(prev => ({ ...prev, strictOvertimeBlocking: checked }))}
                            disabled={isOwner}
                        />
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-card">
                  <CardHeader className="bg-muted/30 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Geofence Sensitivity</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-blue-600 mt-1">GPS Accuracy</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Signal Accuracy Threshold</Label>
                      <div className="grid grid-cols-3 gap-4">
                         {(['low', 'medium', 'high'] as GeofenceSensitivity[]).map((level) => (
                           <button
                             key={level}
                             type="button"
                             onClick={() => !isOwner && setLocalSettings(prev => ({ ...prev, geofenceSensitivity: level }))}
                             className={cn(
                               "h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                               localSettings.geofenceSensitivity === level
                                 ? "bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                 : "bg-muted/50 border-transparent hover:bg-muted text-muted-foreground"
                             )}
                           >
                             <span className="font-black uppercase text-[10px] tracking-widest">{level}</span>
                             <span className="text-[10px] opacity-70">{level === 'high' ? '< 20m' : level === 'medium' ? '< 50m' : '< 100m'}</span>
                           </button>
                         ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </form>
        </Tabs>
      </div>
    </AppLayout>
  );
}