import React, { useEffect, useState } from 'react';
import { Terminal, Server, Shield, Database, Activity, RefreshCw, FileJson, Copy, Trash2, LogOut, Wrench, CloudOff, CloudRain, Zap, Info, ShieldCheck } from 'lucide-react';
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
    const user = useAuthStore(s => s.user);
    const expiresAt = useAuthStore(s => s.expiresAt);
    const clearLocalData = useDataStore(s => s.clearLocalData);
    const syncData = useDataStore(s => s.syncData);
    const cloudSyncEnabled = useDataStore(s => s.cloudSyncEnabled);
    const setCloudSyncEnabled = useDataStore(s => s.setCloudSyncEnabled);
    const [debugData, setDebugData] = useState<any>(null);
    const [dbDump, setDbDump] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dumpLoading, setDumpLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dumpError, setDumpError] = useState<string | null>(null);
    const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
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
            setDbDump({ message: "Database dump is unavailable in Standalone Mode. Data is stored in your browser's SessionStorage." });
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
                            Monitor application health, server environment, and client state.
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
                <Tabs defaultValue="actions" className="w-full">
                    <TabsList className="mb-6 flex-wrap h-auto">
                        <TabsTrigger value="actions" className="flex items-center gap-2"><Wrench className="w-4 h-4"/> System Actions</TabsTrigger>
                        <TabsTrigger value="health" className="flex items-center gap-2"><Activity className="w-4 h-4"/> System Health</TabsTrigger>
                        <TabsTrigger value="data" className="flex items-center gap-2"><Database className="w-4 h-4"/> Data Explorer</TabsTrigger>
                    </TabsList>
                    <TabsContent value="actions" className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* NEW: Standalone / Free Toggle */}
                            <Card className="shadow-md border-t-4 border-t-primary overflow-hidden relative">
                                <div className="absolute top-2 right-2">
                                    <Zap className="h-5 w-5 text-primary/20" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CloudOff className="h-5 w-5 text-primary" />
                                        Data Architecture
                                    </CardTitle>
                                    <CardDescription>Toggle between Cloud-Sync and Standalone mode</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="cloud-sync" className="text-sm font-bold">Cloud Synchronization</Label>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                {cloudSyncEnabled ? 'Enterprise Sync Active' : 'Standalone Mode Active'}
                                            </p>
                                        </div>
                                        <Switch 
                                            id="cloud-sync" 
                                            checked={cloudSyncEnabled} 
                                            onCheckedChange={(checked) => {
                                                setCloudSyncEnabled(checked);
                                                toast.info(checked ? 'Cloud Sync Enabled' : 'Standalone Mode Activated', {
                                                    description: checked 
                                                        ? 'Data will now sync across all team devices.' 
                                                        : 'Data will now only be saved locally to this browser.'
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
                                        <p><strong>Cloud-Sync Mode:</strong> Requires Cloudflare Workers Paid plan ($5/mo). Synchronizes your whole team globally.</p>
                                        <p><strong>Standalone Mode:</strong> 100% Free deployment. Data is saved locally to this device only.</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/10 pt-4 border-t">
                                    <Button asChild variant="link" size="sm" className="px-0 text-xs gap-1.5 h-auto">
                                        <Link to="/help">
                                            <Info className="h-3.5 w-3.5" />
                                            Learn more about free hosting options
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                            <Card className="shadow-sm border-t-4 border-t-emerald-500">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <RefreshCw className="h-5 w-5 text-emerald-500" />
                                        Force Data Sync
                                    </CardTitle>
                                    <CardDescription>Pull the latest data from the server, bypassing local cache</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={async () => {
                                        await syncData(user?.id, user?.role, true);
                                        toast.success('Forced data sync complete');
                                    }} className="w-full" disabled={!cloudSyncEnabled}>
                                        Sync Now
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-t-4 border-t-amber-500">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Trash2 className="h-5 w-5 text-amber-500" />
                                        Clear Local Cache
                                    </CardTitle>
                                    <CardDescription>Wipe local Zustand storage without logging out</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={() => {
                                        clearLocalData();
                                        toast.success('Local cache cleared');
                                    }} variant="outline" className="w-full text-amber-600 border-amber-200 hover:bg-amber-50">
                                        Clear Cache
                                    </Button>
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
                                            <span className="text-sm font-medium">{user?.name} ({user?.email || 'No email'})</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-sm font-medium text-muted-foreground">Role</span>
                                            <Badge variant="outline" className="capitalize">{user?.role}</Badge>
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