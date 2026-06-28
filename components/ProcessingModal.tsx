'use client';

import { Loader2 } from 'lucide-react';
import { useObfuscatorStore } from '@/lib/store';

export function ProcessingModal() {
  const { status, progress } = useObfuscatorStore();
  if (status !== 'processing') return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl shadow-accent/20">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-accent-light" />
          <div>
            <h2 className="font-display text-xl font-semibold">Processing Pack</h2>
            <p className="text-sm text-text-muted">{progress.step}</p>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="mt-3 text-right font-mono text-sm text-text-muted">{progress.percent}%</div>
      </div>
    </div>
  );
}
