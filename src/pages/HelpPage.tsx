import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckSquare,
  QrCode,
  MonitorSmartphone,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Cloud,
  Database,
  CloudOff,
  DollarSign,
  Layers,
  Lock
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export function HelpPage() {
  const features = [
    {
      title: "Secure Time Tracking",
      icon: <Clock className="h-8 w-8 text-emerald-500" />,
      description: "Employees clock in and out securely from their mobile devices. The system enforces geolocation checks and uses AI-powered Face ID or PIN verification to prevent buddy-punching.",
      link: "/time-clock",
      linkText: "View Time Clock",
      badge: "Security First"
    },
    {
      title: "Tasks & Daily Routines",
      icon: <CheckSquare className="h-8 w-8 text-blue-500" />,
      description: "Manage your team's daily workflows with assigned checklists, shift duties, and automated routines. Managers can track completion rates in real-time.",
      link: "/tasks",
      linkText: "Manage Tasks",
      badge: "Operations"
    },
    {
      title: "QR Customer Portal",
      icon: <QrCode className="h-8 w-8 text-purple-500" />,
      description: "Generate over 70 unique QR codes linked to dynamic forms. When a customer scans a code, it automatically creates a task and routes it to the designated employee.",
      link: "/qr-forms",
      linkText: "Build QR Forms",
      badge: "Automation"
    },
    {
      title: "Shared Device Kiosk",
      icon: <MonitorSmartphone className="h-8 w-8 text-amber-500" />,
      description: "Deploy a single iPad or tablet on-site as a centralized time clock. Employees can rapidly search their name and verify their identity via PIN.",
      link: "/kiosk",
      linkText: "Launch Kiosk",
      badge: "Enterprise"
    }
  ];
  return (
    <AppLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-12">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto pt-8">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2 border border-primary/20 shadow-sm">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Support Center
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Highlandview Resort is your all-in-one workforce management command center. We bridge the gap between employee operations and customer requests.
          </p>
        </div>
        {/* Free Deployment & Hosting Guide */}
        <div className="mt-16 bg-blue-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/20 p-2 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Free Deployment & Hosting Guide</h2>
            </div>
            <p className="text-blue-100 text-lg mb-8 max-w-3xl leading-relaxed">
              You can deploy and run this entire application for <strong>$0 per month</strong> using Cloudflare's generous free tier. Below is the guide on how to choose between the Free and Pro infrastructure modes.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mt-10">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">1. Standalone Mode (Free)</h3>
                  <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400">Recommended for Individuals</Badge>
                </div>
                <p className="text-blue-50 text-sm leading-relaxed mb-6">
                  In this mode, the application stores all data locally in your browser (LocalStorage). It uses Cloudflare only to "host" the website files, which is 100% free forever.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Cost:</strong> $0.00 / month</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Privacy:</strong> Data stays on your device</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-white/70">
                    <CloudOff className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Limit:</strong> Data doesn't sync across different phones or computers</span>
                  </li>
                </ul>
                <Button asChild variant="secondary" className="w-full h-12 rounded-xl font-bold shadow-lg">
                  <Link to="/debug">Activate Standalone Mode</Link>
                </Button>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">2. Cloud-Sync Mode (Pro)</h3>
                  <Badge className="bg-blue-300 text-blue-950 hover:bg-blue-300">Enterprise Standard</Badge>
                </div>
                <p className="text-blue-50 text-sm leading-relaxed mb-6">
                  This uses Cloudflare's "Durable Objects" database to sync data in real-time across all team members' devices globally.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Cost:</strong> $5.00 / month (Paid to Cloudflare)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Benefit:</strong> Instant team-wide synchronization</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Safety:</strong> Real-time cloud backups on Cloudflare's edge</span>
                  </li>
                </ul>
                <div className="text-xs text-blue-200 mt-auto text-center italic">
                  *Cloudflare requires the "Workers Paid Plan" to enable Durable Objects.
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Core Modules Grid */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-6 mt-12 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Core Modules
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 flex flex-col h-full overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-muted rounded-xl group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <Badge variant="secondary" className="font-medium bg-muted/50">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 pb-6 bg-muted/10 border-t mt-auto">
                  <Button asChild variant="ghost" className="w-full justify-between group/btn hover:bg-primary hover:text-primary-foreground">
                    <Link to={feature.link}>
                      {feature.linkText}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
        {/* Deployment FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Hosting & Deployment FAQ
          </h2>
          <div className="grid gap-6">
            <Card className="border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold">"Can I run this without Cloudflare?"</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Cloudflare is simply the "host"—the place where the app's code lives on the internet. Using Cloudflare's free tier is the industry standard for safe, fast, and free web hosting. You aren't "locked in" behind a paywall; you are simply using their world-class infrastructure for free.
                </p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold">"How do I publish this to my own domain?"</h3>
                <ol className="list-decimal pl-5 space-y-2 text-muted-foreground text-sm leading-relaxed">
                  <li>Create a <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Cloudflare account</a>.</li>
                  <li>Download the project code to your computer.</li>
                  <li>In your terminal, run <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs border">bun run build</code>.</li>
                  <li>Run <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs border">bun run deploy</code> to push it to your account.</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 font-bookman">Ready to streamline your resort?</h2>
          <p className="text-muted-foreground max-w-2xl mb-8">
            Start by adding your team members, setting up their roles, and choosing your synchronization mode in settings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild className="h-12 px-8 text-base shadow-md">
              <Link to="/users">Manage Team</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base bg-background">
              <Link to="/">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}