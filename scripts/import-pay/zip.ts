/**
 * Minimal reader for .zip files (and .xlsx files, which are zip files).
 * Supports the two methods used by the official files: stored and deflated.
 */
import { createInflateRaw, inflateRawSync } from 'node:zlib';
import { Readable } from 'node:stream';

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localHeaderOffset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

export function listEntries(zip: Buffer): ZipEntry[] {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) {
    if (zip.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file.');

  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(offset) !== CENTRAL_SIGNATURE) throw new Error('Damaged zip file.');
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const size = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (compressedSize === 0xffffffff || size === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error(`"${name}" is too large for this reader (zip64).`);
    }
    entries.push({ name, method, compressedSize, size, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function compressedData(zip: Buffer, entry: ZipEntry): Buffer {
  const at = entry.localHeaderOffset;
  if (zip.readUInt32LE(at) !== LOCAL_SIGNATURE) throw new Error(`Damaged zip entry "${entry.name}".`);
  const start = at + 30 + zip.readUInt16LE(at + 26) + zip.readUInt16LE(at + 28);
  return zip.subarray(start, start + entry.compressedSize);
}

function checkMethod(entry: ZipEntry) {
  if (entry.method !== 0 && entry.method !== 8) {
    throw new Error(`"${entry.name}" uses an unsupported compression method (${entry.method}).`);
  }
}

/** Returns the whole content of one entry. */
export function readEntry(zip: Buffer, entry: ZipEntry): Buffer {
  checkMethod(entry);
  const data = compressedData(zip, entry);
  return entry.method === 0 ? Buffer.from(data) : inflateRawSync(data);
}

/** Returns one entry's content as a stream, for entries too large to hold as text. */
export function streamEntry(zip: Buffer, entry: ZipEntry): Readable {
  checkMethod(entry);
  const source = Readable.from([compressedData(zip, entry)]);
  return entry.method === 0 ? source : source.pipe(createInflateRaw());
}

export function findEntry(zip: Buffer, pattern: RegExp): ZipEntry | undefined {
  return listEntries(zip).find((entry) => pattern.test(entry.name));
}
