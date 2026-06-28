'use client';

import { AlertTriangle, Info, Settings2 } from 'lucide-react';
import { useObfuscatorStore } from '@/lib/store';
import type { ObfuscationOptions } from '@/lib/types';
import { cn } from '@/lib/utils';

const options: Array<{ key: keyof ObfuscationOptions; label: string; hint: string; risky?: boolean }> = [
  { key: 'renameFiles', label: 'Rename Loose Files', hint: 'Only renames non-assets/non-data loose files, so Minecraft references stay valid.' },
  { key: 'shuffleFolders', label: 'Shuffle Loose Folders', hint: 'Only shuffles folders outside assets/ and data/ to avoid broken textures.' },
  { key: 'injectDummy', label: 'Inject Dummy Files', hint: 'Adds believable empty or tiny files across nested folders.' },
  { key: 'minifyJSON', label: 'Minify JSON', hint: 'Strips whitespace from valid .json files.' },
  { key: 'stripPNGMeta', label: 'Strip + Obfuscate PNG', hint: 'Removes metadata and applies PackSquash-style CRC/Adler PNG protection.' },
  { key: 'corruptHeaders', label: 'Protect ZIP Layer', hint: 'Adds EOCD comment/header noise inspired by PackSquash ZIP protection.', risky: true },
  { key: 'deepObfuscation', label: 'Deep Obfuscation', hint: 'Enables every technique. Slower and more aggressive.', risky: true },
];

export function OptionsPanel() {
  const { options: values, setOption, setPreset } = useObfuscatorStore();

  return (
    <aside className="rounded-lg border border-border bg-surface/85 p-5 shadow-2xl shadow-black/25 backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Protection Options</h2>
          <p className="mt-1 text-sm text-text-muted">Tune output strength before processing.</p>
        </div>
        <Settings2 className="h-5 w-5 text-accent-light" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          ['standard', 'Standard'],
          ['maximum', 'Maximum'],
          ['custom', 'Custom'],
        ].map(([key, label]) => (
          <button
            key={key}
            className="h-9 rounded-md border border-border bg-surface-2 text-xs font-semibold text-text transition hover:border-border-accent"
            onClick={() => setPreset(key as 'standard' | 'maximum' | 'custom')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {options.map((item) => (
          <label
            key={item.key}
            className={cn('group flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/45 p-3 transition hover:border-border-accent', values[item.key] && 'border-border-accent bg-accent/10')}
            title={item.hint}
          >
            <input
              type="checkbox"
              checked={values[item.key]}
              onChange={(event) => setOption(item.key, event.target.checked)}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {item.label}
                {item.risky ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> : <Info className="h-3.5 w-3.5 text-text-muted" />}
              </span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">{item.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </aside>
  );
}
