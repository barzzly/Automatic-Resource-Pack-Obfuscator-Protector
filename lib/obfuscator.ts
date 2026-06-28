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

function stripSingleRootFolder(files: FileMap) {
  if (files['pack.mcmeta']) return files;
  const paths = Object.keys(files);
  const first = paths[0]?.split('/')[0];
  if (!first) return files;
  const prefix = `${first}/`;
  if (!paths.every((path) => path.startsWith(prefix))) return files;

  const output: FileMap = {};
  for (const [path, data] of Object.entries(files)) output[path.slice(prefix.length)] = data;
  return output['pack.mcmeta'] ? output : files;
}
function textureReferenceFromPath(path: string) {
  const match = path.match(/^assets\/([^/]+)\/textures\/(.+)\.png$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function textureReferenceAliases(path: string) {
  const reference = textureReferenceFromPath(path);
  if (!reference) return [];
  const [, value] = reference.split(':');
  return [reference, value];
}

function collectReferencedTextures(files: FileMap) {
  const refs = new Set<string>();
  const textureLike = /(?<![A-Za-z0-9_.:-])(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+/g;

  for (const [path, data] of Object.entries(files)) {
    if (!/\.(json|mcmeta|properties|txt|yml|yaml|lang|fsh|vsh|glsl)$/i.test(path)) continue;
    let text = '';
    try {
      text = strFromU8(data);
    } catch {
      continue;
    }

    for (const match of text.matchAll(textureLike)) {
      const value = match[0].replace(/^minecraft:/, 'minecraft:');
      if (value.includes('/') || value.includes(':')) refs.add(value.replace(/\.png$/i, ''));
    }
  }

  return refs;
}

function textureHasReference(path: string, refs: Set<string>) {
  const aliases = textureReferenceAliases(path);
  return aliases.some((alias) => refs.has(alias) || refs.has(alias.replace(/^minecraft:/, '')));
}

function renamePngAssets(files: FileMap) {
  const usedReal = new Set<string>();
  const usedDecoy = new Set<string>();
  const mapping = new Map<string, string>();
  const output: FileMap = {};
  const referencedTextures = collectReferencedTextures(files);

  for (const [path, data] of Object.entries(files)) {
    if (!/^assets\/[^/]+\/textures\/.+\.png$/.test(path) || !textureHasReference(path, referencedTextures)) {
      output[path] = data;
      continue;
    }

    const match = path.match(/^assets\/([^/]+)\/textures\/(.+)\.png$/)!;
    const namespace = match[1];
    const { dirs } = splitPath(path);
    const realPath = `assets/${namespace}/textures/__barzzly/${uniqueHash(usedReal, 12)}.png`;
    const decoyPath = [...dirs, `${uniqueHash(usedDecoy, 10)}.png`].join('/');

    output[realPath] = data;
    output[decoyPath] = crypto.getRandomValues(new Uint8Array(4));
    mapping.set(path, realPath);
  }

  for (const [path, data] of Object.entries(files)) {
    if (!path.endsWith('.png.mcmeta')) continue;
    const pngPath = path.slice(0, -'.mcmeta'.length);
    const nextPngPath = mapping.get(pngPath);
    if (!nextPngPath) continue;
    delete output[path];
    output[`${nextPngPath}.mcmeta`] = data;
  }

  rewriteJsonReferences(output, mapping);
  rewriteTextReferences(output, mapping);
  return { files: output, mapping };
}
function rewriteTextReferences(files: FileMap, mapping: Map<string, string>) {
  const pairs: Array<[string, string]> = [];
  for (const [from, to] of mapping) {
    const toReference = textureReferenceFromPath(to);
    if (!toReference) continue;
    for (const alias of textureReferenceAliases(from)) pairs.push([alias, toReference]);
  }
  if (pairs.length === 0) return;

  for (const [path, data] of Object.entries(files)) {
    if (!/\.(properties|txt|yml|yaml|lang|fsh|vsh|glsl|mcfunction)$/i.test(path)) continue;
    let text = '';
    try {
      text = strFromU8(data);
    } catch {
      continue;
    }
    for (const [from, to] of pairs) {
      text = text.split(from).join(to);
      text = text.split(`${from}.png`).join(`${to}.png`);
    }
    files[path] = strToU8(text);
  }
}
function rewriteJsonReferences(files: FileMap, mapping: Map<string, string>) {
  const refMap = new Map<string, string>();
  for (const [from, to] of mapping) {
    const toReference = textureReferenceFromPath(to);
    if (!toReference) continue;
    for (const alias of textureReferenceAliases(from)) refMap.set(alias, toReference);
  }

  if (refMap.size === 0) return;

  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') return refMap.get(value) ?? value;
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value as Record<string, unknown>)) {
        (value as Record<string, unknown>)[key] = visit((value as Record<string, unknown>)[key]);
      }
    }
    return value;
  };

  for (const [path, data] of Object.entries(files)) {
    if (!path.endsWith('.json') && !path.endsWith('.mcmeta')) continue;
    try {
      files[path] = strToU8(JSON.stringify(visit(JSON.parse(strFromU8(data)))));
    } catch {
      // Invalid JSON-like files stay untouched.
    }
  }
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
    if (path.includes('/textures/.arp/')) continue;
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

function corruptZipHeaders(data: Uint8Array) {
  const eocd = findEocd(data);
  if (eocd < 0) return data;

  const comment = TEXT_ENCODER.encode(`ARP-${randomHex(2048)}`);
  const output = new Uint8Array(data.length + comment.length);
  output.set(data, 0);
  output.set(comment, data.length);
  writeU16LE(output, eocd + 20, comment.length);

  return output;
}
function ensureZip(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) throw new Error('Invalid ZIP file. Please select a .zip resource pack.');
}

export async function obfuscate(input: Uint8Array, options: ObfuscationOptions, onProgress: ProgressCallback = () => {}): Promise<ObfuscationResult> {
  const started = performance.now();
  const active = options.deepObfuscation
    ? { ...options, renameFiles: true, shuffleFolders: false, injectDummy: false, minifyJSON: true, stripPNGMeta: false, corruptHeaders: false }
    : options;

  ensureZip(input);
  onProgress('Reading files...', 8);
  let files = stripSingleRootFolder(await unzipAsync(input));
  if (Object.keys(files).length === 0) throw new Error('ZIP is empty.');

  let dummyFilesAdded = 0;
  let mapping = new Map<string, string>();

  if (active.renameFiles) {
    onProgress('Renaming PNG assets...', 24);
    const renamedPng = renamePngAssets(files);
    files = renamedPng.files;
    mapping = renamedPng.mapping;
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
  }

  if (active.stripPNGMeta) {
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
