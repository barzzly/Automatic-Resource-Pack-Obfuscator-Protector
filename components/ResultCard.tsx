'use client';

import { Download, RotateCcw, Trophy } from 'lucide-react';
import { useObfuscatorStore } from '@/lib/store';
import { formatBytes, makeOutputName } from '@/lib/utils';

export function ResultCard() {
  const { file, result, reset } = useObfuscatorStore();
  if (!file || !result) return null;

  const download = () => {
    const blob = new Blob([result.data.slice().buffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = makeOutputName(file.name);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="confetti animate-pop rounded-lg border border-success/35 bg-surface/90 p-5 shadow-2xl shadow-success/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-success/35 bg-success/10 px-3 py-1 text-sm font-semibold text-success">
              <Trophy className="h-4 w-4" />
              Done
            </div>
            <h2 className="font-display text-2xl font-semibold">Protected pack ready.</h2>
            <p className="mt-1 text-sm text-text-muted">Download result or process another pack.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={download} className="inline-flex h-11 items-center gap-2 rounded-md bg-success px-5 text-sm font-semibold text-black transition hover:brightness-110">
              <Download className="h-4 w-4" />
              Download ZIP
            </button>
            <button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-text transition hover:border-border-accent">
              <RotateCcw className="h-4 w-4" />
              Process Another
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ['Original', formatBytes(result.stats.originalSize)],
            ['Result', formatBytes(result.stats.resultSize)],
            ['Files', result.stats.filesProcessed.toLocaleString()],
            ['Dummy', result.stats.dummyFilesAdded.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border bg-background/70 p-3">
              <div className="text-xs uppercase tracking-normal text-text-muted">{label}</div>
              <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
