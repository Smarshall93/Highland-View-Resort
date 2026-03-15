import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Terminal, Server, Shield, Database, Activity, RefreshCw, FileJson, Copy, Trash2, LogOut, Wrench, CloudOff, Info, Download, Upload, ShieldCheck, AlertTriangle, ListChecks, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { Link } from 'react-router-dom';
export function DebugPage() {
    const userId = useAuthStore(s => s.user?.id);
    const userRole = useAuthStore(s => s.user?.role);
    const userName = useAuthStore(s => s.user?.name);
    const userEmail = useAuthStore(s => s.user?.email);
    const expiresAt = useAuthStore(s => s.expiresAt);
    const tasks = useDataStore(s => s.tasks);
    const timeEntries = useDataStore(s => s.timeEntries);
    const locations = useDataStore(s => s.locations);
    const workSites = useDataStore(s => s.workSites);
    const qrForms = useDataStore(s => s.qrForms);
    const importAuthData = useAuthStore(s => s.importAuthData);
    const syncData = useDataStore(s => s.syncData);
    const cloudSyncEnabled = useDataStore(s => s.cloudSyncEnabled);
    const setCloudSyncEnabled = useDataStore(s => s.setCloudSyncEnabled);
    const importFullState = useDataStore(s => s.importFullState);
    const [debugData, setDebugData] = useState<any>(null);
    const [dbDump, setDbDump] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dumpLoading, setDumpLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dumpError, setDumpError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'owner';
    const fetchDebugData = async () => {
        if (!cloudSyncEnabled) {
            setDebugData({ status: 'STANDALONE', timestamp: new Date().toISOString(), standalone: true });
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await api('/api/debug');
            setDebugData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch debug data');
        } finally {
            setLoading(false);
        }
    };
    const fetchDbDump = async () => {
        if (!cloudSyncEnabled) {
            setDbDump({ message: "Database dump is unavailable in Standalone Mode. Data is stored in your browser's localStorage." });
            setDumpLoading(false);
            return;
        }
        setDumpLoading(true);
        setDumpError(null);
        try {
            const data = await api('/api/debug/dump');
            setDbDump(data);
        } catch (err: any) {
            setDumpError(err.message || 'Failed to fetch database dump');
        } finally {
            setDumpLoading(false);
        }
    };
    useEffect(() => {
        if (isManagerOrAdmin) {
            fetchDebugData();
            fetchDbDump();
        }
    }, [isManagerOrAdmin, cloudSyncEnabled]);
    const handleCopyDump = () => {
        if (dbDump) {
            navigator.clipboard.writeText(JSON.stringify(dbDump, null, 2));
            toast.success('Database dump copied to clipboard');
        }
    };
    const handleHardReset = () => {
        if (window.confirm("Are you sure you want to hard reset the application? This will clear all local data and cache, allowing you to start completely fresh.")) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('/');
        }
    };
    const handleDownloadBackup = () => {
        const dataState = useDataStore.getState();
        const authState = useAuthStore.getState();
        const backup = {
            version: "1.0",
            timestamp: Date.now(),
            auth: {
                user: authState.user,
                expiresAt: authState.expiresAt
            },
            data: {
                tasks: dataState.tasks,
                timeEntries: dataState.timeEntries,
                users: dataState.users,
                locations: dataState.locations,
                qrForms: dataState.qrForms,
                workSites: dataState.workSites,
                shifts: dataState.shifts,
                messages: dataState.messages
            }
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = format(new Date(), 'yyyy-MM-dd-HHmm');
        link.href = url;
        link.download = `highlandview-backup-${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Backup downloaded successfully.");
    };
    const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const backup = JSON.parse(content);
                if (!backup.data || !backup.auth) {
                    throw new Error("Invalid backup file structure.");
                }
                if (window.confirm("This will replace your current local data with the contents of the backup. Continue?")) {
                    importFullState(backup.data);
                    importAuthData(backup.auth);
                    toast.success("Backup restored successfully!", {
                        description: "Your session and data have been updated."
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            } catch (err: any) {
                console.error("Restore failed:", err);
                toast.error("Failed to restore backup: " + (err.message || "Invalid JSON"));
            }
        };
        reader.readAsText(file);
    };
    const auditStats = useMemo(() => [
        { label: 'Tasks Protected', count: tasks.length, icon: ListChecks, color: 'text-blue-500' },
        { label: 'Time Logs Saved', count: timeEntries.length, icon: Clock, color: 'text-emerald-500' },
        { label: 'Places Tracked', count: workSites.length + locations.length, icon: MapPin, color: 'text-amber-500' },
        { label: 'QR Settings', count: qrForms.length, icon: Database, color: 'text-purple-500' }
    ], [tasks, timeEntries, workSites, locations, qrForms]);
    if (!isManagerOrAdmin) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <Shield className="h-16 w-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
                </div>
            </AppLayout>
        );
    }
    return (
        <AppLayout>
            <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Terminal className="h-8 w-8 text-primary" />
                            System Diagnostics
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Monitor application health, server environment, and local storage resilience.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchDebugData} disabled={loading} variant="outline" className="shadow-sm">
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Health
                        </Button>
                        <Button onClick={fetchDbDump} disabled={dumpLoading || !cloudSyncEnabled} className="shadow-sm">
                            <FileJson className={`mr-2 h-4 w-4 ${dumpLoading ? 'animate-pulse' : ''}`} />
                            Dump Database
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {auditStats.map((stat, i) => (
                        <Card key={i} className="border-none bg-slate-50 dark:bg-slate-900 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${stat.color}`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black leading-none">{stat.count}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Tabs defaultValue="actions" className="w-full">
                    <TabsList className="mb-6 flex-wrap h-auto">
                        <TabsTrigger value="actions" className="flex items-center gap-2"><Wrench className="w-4 h-4"/> System Actions</TabsTrigger>
                        <TabsTrigger value="health" className="flex items-center gap-2"><Activity className="w-4 h-4"/> System Health</TabsTrigger>
                        <TabsTrigger value="data" className="flex items-center gap-2"><Database className="w-4 h-4"/> Data Explorer</TabsTrigger>
                    </TabsList>
                    <TabsContent value="actions" className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Backup & Restore Utility */}
                            <Card className="shadow-md border-t-4 border-t-primary overflow-hidden col-span-1 md:col-span-2 lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="h-5 w-5 text-primary" />
                                        Backup & Restore
                                    </CardTitle>
                                    <CardDescription>Export your entire system state to a file</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-muted/30 rounded-xl border border-dashed flex flex-col gap-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                                                <Download className="w-4 h-4 text-primary" /> Export Data
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Download a JSON file containing all tasks, users, time entries, and configurations.
                                            </p>
                                        </div>
                                        <Button onClick={handleDownloadBackup} variant="outline" className="w-full bg-background shadow-sm hover:shadow-md transition-all">
                                            Download Backup (.json)
                                        </Button>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-xl border border-dashed flex flex-col gap-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                                                <Upload className="w-4 h-4 text-emerald-500" /> Import Data
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Upload a previously exported backup file to restore your entire application state.
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleUploadBackup}
                                            accept=".json"
                                            className="hidden"
                                        />
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            variant="secondary"
                                            className="w-full shadow-sm hover:shadow-md transition-all"
                                        >
                                            Upload & Restore File
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-amber-50 dark:bg-amber-900/20 pt-4 border-t">
                                    <div className="flex gap-2 items-start">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                                            Restoring a backup will overwrite all current local data. Ensure you have saved any important changes before proceeding.
                                        </p>
                                    </div>
                                </CardFooter>
                            </Card>
                            <Card className="shadow-md border-t-4 border-t-primary overflow-hidden relative">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                        Local Resilience
                                    </CardTitle>
                                    <CardDescription>Persistent Data Protection Status</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold text-emerald-900 dark:text-emerald-400">LocalStorage Active</Label>
                                            <p className="text-[10px] text-emerald-700/80 uppercase tracking-wider font-semibold">
                                                Survives Browser Crashes
                                            </p>
                                        </div>
                                        <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground leading-relaxed flex flex-col gap-3">
                                        <p>Your "hrs, task settings, and places" are now strictly mirrored in the device's persistent storage.</p>
                                        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="h-10 font-bold uppercase tracking-widest text-[10px] w-full">
                                            Force Persistence Flush
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-t-4 border-t-destructive">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <LogOut className="h-5 w-5 text-destructive" />
                                        Hard Reset
                                    </CardTitle>
                                    <CardDescription>Clear all local storage, session storage, and reload</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={handleHardReset} variant="destructive" className="w-full">
                                        Hard Reset
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="health" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Server className="h-5 w-5 text-blue-500" />
                                        Server Status
                                    </CardTitle>
                                    <CardDescription>Real-time backend health and environment</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {loading && !debugData ? (
                                        <div className="space-y-2">
                                            <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                                            <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
                                        </div>
                                    ) : error ? (
                                        <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md border border-destructive/20">
                                            {error}
                                        </div>
                                    ) : debugData ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                                <Badge variant="outline" className={debugData.standalone ? "bg-slate-100 text-slate-600" : "bg-emerald-500/10 text-emerald-600 border-emerald-200"}>
                                                    {debugData.status?.toUpperCase() || 'UNKNOWN'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-sm font-medium text-muted-foreground">Mode</span>
                                                <span className="text-sm font-bold uppercase">{cloudSyncEnabled ? 'Cloud-Sync' : 'Standalone (Local)'}</span>
                                            </div>
                                            {!debugData.standalone && (
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-sm font-medium text-muted-foreground">Global DO Binding</span>
                                                    {debugData.env?.hasGlobalDO ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Connected</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">Missing</Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-purple-500" />
                                        Client Session
                                    </CardTitle>
                                    <CardDescription>Local browser authentication state</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-sm font-medium text-muted-foreground">Current User</span>
                                            <span className="text-sm font-medium">{userName} ({userEmail || 'No email'})</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-sm font-medium text-muted-foreground">Role</span>
                                            <Badge variant="outline" className="capitalize">{userRole}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-sm font-medium text-muted-foreground">Session Expiry</span>
                                            <span className="text-sm font-mono">
                                                {expiresAt ? format(new Date(expiresAt), 'PPp') : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="data">
                        <Card className="shadow-sm border-t-4 border-t-blue-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-blue-500" />
                                    Database Explorer
                                </CardTitle>
                                <CardDescription>
                                    {cloudSyncEnabled 
                                        ? 'Direct view into the raw entity data stored in the Durable Object' 
                                        : 'Standalone mode uses local browser storage. Remote dump unavailable.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {dumpLoading && !dbDump ? (
                                    <div className="h-64 flex items-center justify-center bg-muted/20 border-2 border-dashed rounded-xl">
                                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground opacity-50" />
                                    </div>
                                ) : dumpError ? (
                                    <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md border border-destructive/20">
                                        {dumpError}
                                    </div>
                                ) : dbDump ? (
                                    <div className="relative group">
                                        {cloudSyncEnabled && (
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={handleCopyDump}
                                            >
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copy JSON
                                            </Button>
                                        )}
                                        <pre className="bg-slate-950 text-slate-50 p-6 rounded-xl overflow-auto h-[600px] text-xs font-mono shadow-inner border border-slate-800">
                                            <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(dbDump, null, 2)) }} />
                                        </pre>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
function syntaxHighlight(json: string) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
        let cls = 'text-blue-400';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-emerald-400';
            } else {
                cls = 'text-amber-300';
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-purple-400';
        } else if (/null/.test(match)) {
            cls = 'text-slate-500';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}