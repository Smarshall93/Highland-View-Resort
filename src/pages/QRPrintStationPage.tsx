import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Search, Mountain } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { cn } from '@/lib/utils';
export function QRPrintStationPage() {
  const qrForms = useDataStore(s => s.qrForms);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const categories = useMemo(() => {
    const cats = new Set(qrForms.map(f => f.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [qrForms]);
  const filteredForms = useMemo(() => {
    return qrForms.filter(f => {
      const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || f.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [qrForms, search, categoryFilter]);
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const selectAll = () => {
    if (selectedIds.size === filteredForms.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredForms.map(f => f.id)));
  };
  const handlePrint = () => {
    window.print();
  };
  return (
    <AppLayout contentClassName="print:p-0 print:max-w-none">
      <div className="space-y-8 animate-in fade-in duration-500 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Printer className="h-8 w-8 text-primary" />
              Batch QR Print Station
            </h1>
            <p className="text-muted-foreground mt-1">Manage and print physical signage for over 70+ resort forms.</p>
          </div>
          <Button
            disabled={selectedIds.size === 0}
            onClick={handlePrint}
            className="h-12 px-8 shadow-xl bg-primary hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Printer className="mr-2 h-5 w-5" />
            Print Selected ({selectedIds.size})
          </Button>
        </div>
        <Card className="border-none shadow-sm bg-muted/30">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms by title..."
                className="pl-10 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center overflow-x-auto pb-2 md:pb-0">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className="rounded-full px-4 h-9"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" onClick={selectAll} className="font-bold text-primary">
                {selectedIds.size === filteredForms.length ? 'Deselect All' : 'Select All'}
             </Button>
             <span className="text-sm text-muted-foreground">{filteredForms.length} forms found</span>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredForms.map(form => (
            <Card
              key={form.id}
              className={cn(
                "group cursor-pointer transition-all duration-200 border-2",
                selectedIds.has(form.id) ? "border-primary bg-primary/5" : "hover:border-primary/50"
              )}
              onClick={() => toggleSelect(form.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-white p-1 rounded-lg border shadow-inner">
                    <QRCodeSVG value={`${window.location.origin}/f/${form.id}`} size={32} />
                  </div>
                  <Checkbox checked={selectedIds.has(form.id)} />
                </div>
                <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">{form.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold">
                    {form.category || 'General'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{form.fields.length} fields</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* PRINT-ONLY AREA */}
      <div className="hidden print:block print:w-full">
        <div className="grid grid-cols-2 gap-8">
          {qrForms.filter(f => selectedIds.has(f.id)).map(form => (
            <div key={form.id} className="border-2 border-black p-10 flex flex-col items-center justify-center text-center space-y-6 page-break-inside-avoid">
              <div className="flex items-center gap-4 mb-4">
                 <div className="h-12 w-12 flex items-center justify-center bg-black rounded-xl text-white">
                    <Mountain className="h-8 w-8" />
                 </div>
                 <span className="text-2xl font-black uppercase tracking-tighter">Highland View Resort</span>
              </div>
              <div className="p-4 bg-white border-4 border-black rounded-3xl shadow-xl">
                 <QRCodeSVG value={`${window.location.origin}/f/${form.id}`} size={300} level="H" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-4xl font-black">{form.title}</h2>
                 <p className="text-xl font-medium text-slate-700">Scan to submit request</p>
              </div>
              <div className="pt-6 border-t-2 border-dashed border-slate-300 w-full">
                 <Badge className="bg-black text-white px-4 py-1 text-lg rounded-full">
                   {form.category || 'Resort Operations'}
                 </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}