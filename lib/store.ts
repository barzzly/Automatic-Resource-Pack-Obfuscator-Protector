'use client';

import { create } from 'zustand';
import type { ObfuscationOptions, ObfuscationResult, ProgressState } from './types';

const defaultOptions: ObfuscationOptions = {
  renameFiles: false,
  shuffleFolders: false,
  injectDummy: false,
  minifyJSON: true,
  stripPNGMeta: true,
  corruptHeaders: false,
  deepObfuscation: false,
};

type Status = 'idle' | 'processing' | 'done' | 'error';

type ObfuscatorStore = {
  file: File | null;
  options: ObfuscationOptions;
  status: Status;
  progress: ProgressState;
  result: ObfuscationResult | null;
  error: string | null;
  warning: string | null;
  setFile: (file: File | null) => void;
  setOption: (key: keyof ObfuscationOptions, value: boolean) => void;
  setPreset: (preset: 'standard' | 'maximum' | 'custom') => void;
  setStatus: (status: Status) => void;
  setProgress: (progress: ProgressState) => void;
  setResult: (result: ObfuscationResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useObfuscatorStore = create<ObfuscatorStore>((set) => ({
  file: null,
  options: defaultOptions,
  status: 'idle',
  progress: { step: 'Waiting...', percent: 0 },
  result: null,
  error: null,
  warning: null,
  setFile: (file) =>
    set({
      file,
      status: file ? 'idle' : 'idle',
      result: null,
      error: null,
      warning: file && file.size > 200 * 1024 * 1024 ? 'Large file. Browser memory use may be high.' : null,
    }),
  setOption: (key, value) =>
    set((state) => ({
      options: { ...state.options, [key]: value, deepObfuscation: key === 'deepObfuscation' ? value : false },
    })),
  setPreset: (preset) =>
    set(() => {
      if (preset === 'maximum') {
        return {
          options: {
            renameFiles: false,
            shuffleFolders: false,
            injectDummy: true,
            minifyJSON: true,
            stripPNGMeta: true,
            corruptHeaders: true,
            deepObfuscation: true,
          },
        };
      }
      if (preset === 'standard') return { options: defaultOptions };
      return {};
    }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setResult: (result) => set({ result, status: result ? 'done' : 'idle' }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
  reset: () =>
    set({
      file: null,
      options: defaultOptions,
      status: 'idle',
      progress: { step: 'Waiting...', percent: 0 },
      result: null,
      error: null,
      warning: null,
    }),
}));
