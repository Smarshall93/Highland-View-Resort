import React from 'react';
interface PlaceholderPageProps {
  title: string;
}
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-foreground animate-in fade-in duration-500">
      <div className="text-center space-y-4 max-w-md mx-auto p-8 rounded-2xl bg-card border shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">This feature will be implemented in a future phase.</p>
        <div className="mt-8 pt-6 border-t border-border flex justify-center">
          <div className="w-16 h-1 rounded-full bg-primary/20"></div>
        </div>
      </div>
    </div>
  );
}