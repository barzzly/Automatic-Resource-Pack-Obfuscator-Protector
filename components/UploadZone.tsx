'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, ShieldCheck, Upload, X } from 'lucide-react';
import { obfuscate } from '@/lib/obfuscator';
import { useObfuscatorStore } from '@/lib/store';
import type { ObfuscationResult } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';

type WorkerMessage =
  | { type: 'progress'; step: string; percent: number }
  | { type: 'done'; result: ObfuscationResult }
  | { type: 'error'; message: string };

async function hasZipMagic(file: File) {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return header[0] === 0x50 && header[1] === 0x4b;
}

export function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [dragging, setDragging] = useState(false);
  const { file, status, warning, setFile, setStatus, setProgress, setResult, setError, reset } = useObfuscatorStore();

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    workerRef.current = new Worker(new URL('../lib/worker.ts', import.meta.url));
    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') setProgress({ step: message.step, percent: message.percent });
      if (message.type === 'done') setResult(message.result);
      if (message.type === 'error') setError(message.message);
    };
    return () => workerRef.current?.terminate();
  }, [setError, setProgress, setResult]);

  const selectFile = async (candidate: File | null) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip files are supported.');
      return;
    }
    if (!(await hasZipMagic(candidate))) {
      setError('Invalid ZIP file. Please select a real resource pack ZIP.');
      return;
    }
    setFile(candidate);
  };

  const processFile = async () => {
    if (!file) return;
    setStatus('processing');
    setError(null);
    setProgress({ step: 'Starting...', percent: 1 });

    if (workerRef.current) {
      workerRef.current.postMessage({ file, options: { renameFiles: true, shuffleFolders: false, injectDummy: false, minifyJSON: true, stripPNGMeta: false, corruptHeaders: false, deepObfuscation: false } });
      return;
    }

    try {
      const result = await obfuscate(new Uint8Array(await file.arrayBuffer()), { renameFiles: true, shuffleFolders: false, injectDummy: false, minifyJSON: true, stripPNGMeta: false, corruptHeaders: false, deepObfuscation: false }, (step, percent) => setProgress({ step, percent }));
      setResult(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Processing failed.');
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface/90 p-6 shadow-2xl shadow-black/25 backdrop-blur">
      <div
        className={cn(
          'relative grid min-h-[420px] place-items-center rounded-lg border-2 border-dashed border-muted bg-background/55 p-6 text-center transition',
          dragging && 'glow-border border-border-accent bg-accent/10',
          file && 'border-border-accent',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files.item(0));
        }}
      >
        <input ref={inputRef} hidden type="file" accept=".zip,application/zip" onChange={(event) => selectFile(event.target.files?.item(0) ?? null)} />
        <div className="max-w-md">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-lg bg-accent/15 text-accent-light glow-purple">
            <Upload className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-semibold">{file ? file.name : 'Drop Pack ZIP'}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">{file ? `${formatBytes(file.size)} selected` : 'One click protection: rename textures, fix JSON refs, rewrite texture references, keep Minecraft compatible.'}</p>
          {warning ? <p className="mt-3 text-sm text-warning">{warning}</p> : null}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-4 text-sm font-semibold text-text transition hover:border-border-accent"
              onClick={() => inputRef.current?.click()}
              disabled={status === 'processing'}
            >
              <Upload className="h-4 w-4" />
              {file ? 'Change File' : 'Browse ZIP'}
            </button>
            {file ? (
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                onClick={processFile}
                disabled={status === 'processing'}
              >
                <ShieldCheck className="h-4 w-4" />
                Protect Pack
              </button>
            ) : null}
            {file ? (
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-text-muted transition hover:border-error hover:text-error"
                onClick={reset}
                title="Reset"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {status === 'error' ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-error/40 bg-error/10 p-3 text-sm text-error">
          <span>{useObfuscatorStore.getState().error}</span>
          <button className="inline-flex items-center gap-1 font-semibold" onClick={() => setError(null)}>
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}
    </section>
  );
}
