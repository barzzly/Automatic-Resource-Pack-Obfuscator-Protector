'use client';

import Image from 'next/image';
import { Download, FileArchive, Grid3X3, Shield, Settings } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { ProcessingModal } from '@/components/ProcessingModal';
import { ResultCard } from '@/components/ResultCard';
import { UploadZone } from '@/components/UploadZone';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07080b] text-text">
      <div className="grid-field fixed inset-0 -z-10 opacity-60" />
      <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border bg-[#111116]/95 px-5 backdrop-blur">
        <div className="flex items-center gap-4">
          <Image src="/BarzzLy-Black-NoBackround.png" alt="BarzzLy" width={44} height={44} priority className="h-9 w-auto object-contain" />
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-sm font-bold uppercase tracking-normal text-white">BarzzLy</div>
            <div className="text-xs text-text-muted">Automatic Resource Pack Obfuscator & Protector</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-muted">browser-only</span>
          <a href="#upload" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-light">
            <Download className="h-4 w-4" />
            Protect
          </a>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-70px)] md:grid-cols-[350px_1fr]">
        <aside className="border-r border-border bg-[#15151b]/95 p-5">
          <div className="mb-7 text-xs font-bold uppercase tracking-normal text-text-muted">Settings & Hierarchy</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-md bg-surface-2 px-3 py-3 text-sm font-semibold text-white">
              <Grid3X3 className="h-4 w-4 text-accent-light" />
              Pack Config
            </div>
            <div className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-text-muted">
              <Shield className="h-4 w-4" />
              Fixed Protection
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase text-text-muted">Mode</label>
              <div className="mt-2 rounded-md border border-border bg-background px-4 py-3 text-sm font-semibold">Minecraft Safe</div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-text-muted">Enabled</label>
              <div className="mt-2 space-y-2 text-sm text-text-muted">
                <div className="rounded-md border border-border bg-background/70 px-3 py-2">Texture rename</div>
                <div className="rounded-md border border-border bg-background/70 px-3 py-2">JSON reference rewrite</div>
                <div className="rounded-md border border-border bg-background/70 px-3 py-2">JSON minify</div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-text-muted">Disabled</label>
              <div className="mt-2 rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-text-muted">PNG/ZIP corruption</div>
            </div>
          </div>
        </aside>

        <section className="relative flex flex-col">
          <div className="border-b border-border bg-[#0d0e12]/80 px-5 py-3">
            <div className="inline-flex rounded-md border border-border bg-surface p-1 text-sm font-semibold">
              <span className="rounded bg-accent px-3 py-2 text-white">Visual Grid</span>
              <span className="px-3 py-2 text-text-muted">Pack Output</span>
            </div>
          </div>
          <div id="upload" className="flex flex-1 items-center justify-center p-5 md:p-10">
            <div className="w-full max-w-3xl">
              <UploadZone />
              <ResultCard />
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <ProcessingModal />
    </main>
  );
}