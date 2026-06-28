export interface ObfuscationOptions {
  renameFiles: boolean;
  shuffleFolders: boolean;
  injectDummy: boolean;
  minifyJSON: boolean;
  stripPNGMeta: boolean;
  corruptHeaders: boolean;
  deepObfuscation: boolean;
}

export interface ObfuscationStats {
  originalSize: number;
  resultSize: number;
  filesProcessed: number;
  dummyFilesAdded: number;
  timeTaken: number;
}

export interface ObfuscationResult {
  data: Uint8Array;
  stats: ObfuscationStats;
}

export type ProgressState = {
  step: string;
  percent: number;
};
