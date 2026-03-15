import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Loader2, UserCircle, RefreshCw, MonitorSmartphone, Mail, Lock, ArrowRight, Mountain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import type { User } from '@shared/types';
export function LoginPage() {
  const [email, setEmail] = useState('admin@synqwork.com');
  const [password, setPassword] = useState('123');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore(s => s.user);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const authUser = await api<User>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password })
      });
      toast.success(`Welcome back, ${authUser.name}!`);
      login(authUser, rememberMe);
      navigate(from, { replace: true });
    } catch (e: any) {
      console.error('Login failed:', e.message || String(e));
      toast.error(e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleHardReset = () => {
    if (window.confirm("Are you sure you want to hard reset the application? This will clear all local data and cache, allowing you to start completely fresh.")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="text-center mb-8 sm:mb-12">
         <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mb-4 drop-shadow-xl bg-primary/10 border border-primary/20 rounded-3xl text-primary">
            <Mountain className="h-12 w-12 sm:h-16 sm:w-16" />
         </div>
         <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-bookman">Highland View Resort</h1>
         <p className="text-muted-foreground mt-2 text-lg">Workforce Operations Platform</p>
      </div>
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
        {/* Employee Login Column */}
        <Card className="shadow-xl border-t-4 border-t-primary animate-in fade-in slide-in-from-left-8 duration-700 h-full flex flex-col">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCircle className="h-6 w-6 text-primary" />
              Account Log In
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Log in to access your dashboard and tasks
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin} className="flex flex-col flex-1">
            <CardContent className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-10 h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(c) => setRememberMe(c as boolean)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Keep me logged in for 14 days
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6 bg-muted/10 border-t mt-auto">
              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</>
                ) : (
                  <>Log In <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        {/* Kiosk Mode Column */}
        <Card className="shadow-xl border-t-4 border-t-amber-500 animate-in fade-in slide-in-from-right-8 duration-700 h-full flex flex-col bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <MonitorSmartphone className="h-6 w-6 text-amber-500" />
              Shared Device Kiosk
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Fast, secure PIN-based clock-ins for shared tablets
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center text-center space-y-6 px-8">
             <div className="bg-amber-100 dark:bg-amber-900/30 p-6 rounded-full">
                <MonitorSmartphone className="h-16 w-16 text-amber-600 dark:text-amber-500" />
             </div>
             <div className="space-y-2">
                <p className="text-muted-foreground leading-relaxed">
                  Kiosk Mode is designed for public front-desk iPads or shared office computers. Employees can select their name and verify their shift using their unique 4-digit PIN.
                </p>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/40 p-2 rounded-md border border-amber-200 dark:border-amber-800/50 mt-4">
                  Does not require a personal login session.
                </p>
             </div>
          </CardContent>
          <CardFooter className="pt-6 bg-amber-100/50 dark:bg-amber-900/20 border-t border-amber-200/50 dark:border-amber-800/30 mt-auto">
            <Button
              type="button"
              className="w-full h-14 text-lg font-medium shadow-md transition-all hover:shadow-lg active:scale-[0.98] bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => navigate('/kiosk')}
            >
              Launch Kiosk Mode
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="mt-12 flex flex-col items-center gap-4 text-center text-xs text-muted-foreground">
        <p>Built with ❤️ by Aurelia | Your AI Co-founder</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHardReset}
          className="text-muted-foreground/50 hover:text-muted-foreground h-auto py-1"
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Troubleshooting: Hard Reset Application
        </Button>
      </div>
    </div>
  );
}