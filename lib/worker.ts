/// <reference lib="webworker" />

import { obfuscate } from './obfuscator';
import type { ObfuscationOptions } from './types';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<{ file: File; options: ObfuscationOptions }>) => {
  const { file, options } = event.data;

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const result = await obfuscate(data, options, (step, percent) => {
      ctx.postMessage({ type: 'progress', step, percent });
    });
    ctx.postMessage({ type: 'done', result });
  } catch (error) {
    ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Processing failed.' });
  }
};
