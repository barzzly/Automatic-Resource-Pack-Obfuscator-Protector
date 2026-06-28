import { strFromU8, strToU8, unzip, zip, type Zippable } from 'fflate';
import type { ObfuscationOptions, ObfuscationResult } from './types';

type FileMap = Record<string, Uint8Array>;
type ProgressCallback = (step: string, percent: number) => void;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const RESERVED_FILES = new Set(['pack.mcmeta', 'pack.png']);
const SAFE_PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'tIME', 'bKGD', 'pHYs']);
const PNG_CRC_KEY = new Uint8Array([0xca, 0xfe, 0xba, 0xbe]);
const PNG_ADLER_KEY = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
const LISTED_RESOURCE_PREFIXES = ['assets/', 'data/'];

function unzipAsync(data: Uint8Array): Promise<FileMap> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function zipAsync(files: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function randomHex(length = 8) {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

function uniqueHash(used: Set<string>, length = 8) {
  let value = randomHex(length);
  while (used.has(value)) value = randomHex(length);
  used.add(value);
  return value;
}

function splitPath(path: string) {
  const parts = path.split('/').filter(Boolean);
  const name = parts.pop() ?? path;
  return { dirs: parts, name };
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > -1 ? name.slice(dot) : '';
}

function isReserved(path: string) {
  return RESERVED_FILES.has(path) || path.endsWith('/pack.mcmeta') || path.endsWith('/pack.png');
}

function isListedMinecraftResource(path: string) {
  return LISTED_RESOURCE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isSafeToRename(path: string) {
  return !isReserved(path) && !isListedMinecraftResource(path);
}

function isSafeToShuffle(path: string) {
  return !isListedMinecraftResource(path);
}

function renameFiles(files: FileMap) {
  const used = new Set<string>();
  const mapping = new Map<string, string>();
  const output: FileMap = {};

  for (const [path, data] of Object.entries(files)) {
    if (!isSafeToRename(path)) {
      output[path] = data;
      mapping.set(path, path);
      continue;
    }

    const { dirs, name } = splitPath(path);
    const nextName = `${uniqueHash(used)}${extensionOf(name)}`;
    const nextPath = [...dirs, nextName].join('/');
    output[nextPath] = data;
    mapping.set(path, nextPath);
  }

  return { files: output, mapping };
}

function shuffleFolders(files: FileMap) {
  const folderMap = new Map<string, string>();
  const used = new Set<string>();
  const output: FileMap = {};

  for (const [path, data] of Object.entries(files)) {
    if (!isSafeToShuffle(path)) {
      output[path] = data;
      continue;
    }

    const { dirs, name } = splitPath(path);
    const nextDirs = dirs.map((dir, index) => {
      const prefix = dirs.slice(0, index + 1).join('/');
      if (!folderMap.has(prefix)) folderMap.set(prefix, uniqueHash(used, 6));
      return folderMap.get(prefix)!;
    });
    output[[...nextDirs, name].join('/')] = data;
  }

  return output;
}

function updateSoundReferences(files: FileMap, mapping: Map<string, string>) {
  const referenceMap = new Map<string, string>();

  for (const [from, to] of mapping) {
    const fromNoExt = from.replace(/\.[^/.]+$/, '');
    const toNoExt = to.replace(/\.[^/.]+$/, '');
    referenceMap.set(fromNoExt, toNoExt);
    referenceMap.set(from.replace(/^assets\/minecraft\/sounds\//, '').replace(/\.[^/.]+$/, ''), to.replace(/^assets\/minecraft\/sounds\//, '').replace(/\.[^/.]+$/, ''));
  }

  for (const [path, data] of Object.entries(files)) {
    if (!path.endsWith('sounds.json')) continue;

    try {
      const json = JSON.parse(TEXT_DECODER.decode(data));
      const visit = (value: unknown): unknown => {
        if (typeof value === 'string') return referenceMap.get(value) ?? value;
        if (Array.isArray(value)) return value.map(visit);
        if (value && typeof value === 'object') {
          for (const key of Object.keys(value as Record<string, unknown>)) {
            (value as Record<string, unknown>)[key] = visit((value as Record<string, unknown>)[key]);
          }
        }
        return value;
      };
      files[path] = strToU8(JSON.stringify(visit(json)));
    } catch {
      // Invalid sounds.json should not block pack processing.
    }
  }
}

function minifyJson(files: FileMap) {
  for (const [path, data] of Object.entries(files)) {
    if (!path.endsWith('.json')) continue;
    try {
      files[path] = strToU8(JSON.stringify(JSON.parse(strFromU8(data))));
    } catch {
      console.warn(`Skipped invalid JSON: ${path}`);
    }
  }
}

function stripPngMetadata(files: FileMap) {
  for (const [path, data] of Object.entries(files)) {
    if (!path.endsWith('.png') || data.length < 12) continue;
    const signature = data.slice(0, 8);
    if (signature[0] !== 0x89 || signature[1] !== 0x50 || signature[2] !== 0x4e || signature[3] !== 0x47) continue;

    const chunks: Uint8Array[] = [signature];
    let offset = 8;

    while (offset + 12 <= data.length) {
      const length = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0);
      const typeStart = offset + 4;
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > data.length) break;

      const type = TEXT_DECODER.decode(data.slice(typeStart, typeStart + 4));
      if (!SAFE_PNG_DROP.has(type)) chunks.push(data.slice(offset, chunkEnd));
      offset = chunkEnd;
      if (type === 'IEND') break;
    }

    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const rebuilt = new Uint8Array(size);
    let cursor = 0;
    for (const chunk of chunks) {
      rebuilt.set(chunk, cursor);
      cursor += chunk.length;
    }
    files[path] = rebuilt;
  }
}

function obfuscatePngDatastreams(files: FileMap) {
  for (const [path, data] of Object.entries(files)) {
    if (!path.endsWith('.png') || data.length < 20) continue;
    if (data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4e || data[3] !== 0x47) continue;

    const png = data.slice();
    let offset = 8;
    while (offset + 12 <= png.length) {
      const length = new DataView(png.buffer, png.byteOffset + offset, 4).getUint32(0);
      const typeStart = offset + 4;
      const dataStart = offset + 8;
      const crcStart = dataStart + length;
      const chunkEnd = crcStart + 4;
      if (chunkEnd > png.length) break;

      const type = TEXT_DECODER.decode(png.slice(typeStart, typeStart + 4));
      if (type === 'IDAT' && length >= 4) {
        for (let index = 0; index < 4; index += 1) png[crcStart - 4 + index] ^= PNG_ADLER_KEY[index];
      }
      for (let index = 0; index < 4; index += 1) png[crcStart + index] ^= PNG_CRC_KEY[index];

      offset = chunkEnd;
      if (type === 'IEND') break;
    }
    files[path] = png;
  }
}

function injectDummyFiles(files: FileMap, aggressive: boolean) {
  const folders = Array.from(new Set(Object.keys(files).map((path) => path.split('/').slice(0, -1).join('/')).filter((path) => path.split('/').length > 2)));
  const targets = folders.length ? folders : ['assets/minecraft/misc'];
  const count = aggressive ? 500 : 200;
  const exts = ['.png', '.json', '.ogg', '.txt'];

  for (let index = 0; index < count; index += 1) {
    const folder = targets[index % targets.length];
    const ext = exts[index % exts.length];
    const path = `${folder}/${randomHex(10)}${ext}`;
    const payload = ext === '.json' ? TEXT_ENCODER.encode('{}') : crypto.getRandomValues(new Uint8Array(4));
    files[path] = payload;
  }

  return count;
}

function readU32LE(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
}

function writeU16LE(data: Uint8Array, offset: number, value: number) {
  new DataView(data.buffer, data.byteOffset + offset, 2).setUint16(0, value, true);
}

function writeU32LE(data: Uint8Array, offset: number, value: number) {
  new DataView(data.buffer, data.byteOffset + offset, 4).setUint32(0, value >>> 0, true);
}

function findEocd(data: Uint8Array) {
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - 65557); offset -= 1) {
    if (data[offset] === 0x50 && data[offset + 1] === 0x4b && data[offset + 2] === 0x05 && data[offset + 3] === 0x06) return offset;
  }
  return -1;
}

function patchCentralDirectoryOffsets(data: Uint8Array, centralDirectoryOffset: number, centralDirectorySize: number, delta: number) {
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset + 46 <= end) {
    if (data[offset] !== 0x50 || data[offset + 1] !== 0x4b || data[offset + 2] !== 0x01 || data[offset + 3] !== 0x02) break;

    const fileNameLength = new DataView(data.buffer, data.byteOffset + offset + 28, 2).getUint16(0, true);
    const extraFieldLength = new DataView(data.buffer, data.byteOffset + offset + 30, 2).getUint16(0, true);
    const fileCommentLength = new DataView(data.buffer, data.byteOffset + offset + 32, 2).getUint16(0, true);
    const localHeaderOffset = readU32LE(data, offset + 42);
    if (localHeaderOffset !== 0xffffffff) writeU32LE(data, offset + 42, localHeaderOffset + delta);

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }
}
function corruptZipHeaders(data: Uint8Array) {
  const eocd = findEocd(data);
  if (eocd < 0) return data;

  const fakeHeader = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
  const comment = TEXT_ENCODER.encode(`ARP-${randomHex(256)}`);
  const output = new Uint8Array(fakeHeader.length + data.length + comment.length);
  output.set(fakeHeader, 0);
  output.set(data, fakeHeader.length);
  output.set(comment, fakeHeader.length + data.length);

  const shiftedEocd = fakeHeader.length + eocd;
  const centralDirectorySize = readU32LE(output, shiftedEocd + 12);
  const centralDirectoryOffset = readU32LE(output, shiftedEocd + 16);
  patchCentralDirectoryOffsets(output, fakeHeader.length + centralDirectoryOffset, centralDirectorySize, fakeHeader.length);
  writeU32LE(output, shiftedEocd + 16, centralDirectoryOffset + fakeHeader.length);
  writeU16LE(output, shiftedEocd + 20, comment.length);

  return output;
}

function ensureZip(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) throw new Error('Invalid ZIP file. Please select a .zip resource pack.');
}

export async function obfuscate(input: Uint8Array, options: ObfuscationOptions, onProgress: ProgressCallback = () => {}): Promise<ObfuscationResult> {
  const started = performance.now();
  const active = options.deepObfuscation
    ? { ...options, renameFiles: false, shuffleFolders: false, injectDummy: true, minifyJSON: true, stripPNGMeta: true, corruptHeaders: true }
    : options;

  ensureZip(input);
  onProgress('Reading files...', 8);
  let files = await unzipAsync(input);
  if (Object.keys(files).length === 0) throw new Error('ZIP is empty.');

  let dummyFilesAdded = 0;
  let mapping = new Map<string, string>();

  if (active.renameFiles) {
    onProgress('Renaming...', 24);
    const renamed = renameFiles(files);
    files = renamed.files;
    mapping = renamed.mapping;
    updateSoundReferences(files, mapping);
  }

  if (active.shuffleFolders) {
    onProgress('Shuffling folders...', 42);
    files = shuffleFolders(files);
  }

  if (active.injectDummy) {
    onProgress('Injecting dummy files...', 58);
    dummyFilesAdded = injectDummyFiles(files, active.deepObfuscation);
  }

  if (active.minifyJSON) {
    onProgress('Minifying JSON...', 70);
    minifyJson(files);
  }

  if (active.stripPNGMeta) {
    onProgress('Stripping PNG metadata...', 78);
    stripPngMetadata(files);
    onProgress('Obfuscating PNG datastreams...', 84);
    obfuscatePngDatastreams(files);
  }

  onProgress('Compressing...', 91);
  let data = await zipAsync(files);

  if (active.corruptHeaders) {
    onProgress('Hardening ZIP headers...', 96);
    data = corruptZipHeaders(data);
  }

  onProgress('Done!', 100);
  return {
    data,
    stats: {
      originalSize: input.byteLength,
      resultSize: data.byteLength,
      filesProcessed: Object.keys(files).length,
      dummyFilesAdded,
      timeTaken: Math.round(performance.now() - started),
    },
  };
}
