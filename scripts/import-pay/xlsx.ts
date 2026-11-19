/**
 * Minimal reader for the first worksheet of an .xlsx file. It streams the
 * worksheet, so very large files can be read, and passes each row to a
 * filter so only the rows needed are kept.
 */
import { StringDecoder } from 'node:string_decoder';
import { findEntry, readEntry, streamEntry } from './zip.ts';

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

/** Joins the text runs (<t>…</t>) inside one string item. */
function textOf(xml: string): string {
  let out = '';
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) {
    out += decodeXml(match[1] ?? '');
  }
  return out;
}

function readSharedStrings(xlsx: Buffer): string[] {
  const entry = findEntry(xlsx, /^xl\/sharedStrings\.xml$/i);
  if (!entry) return [];
  const xml = readEntry(xlsx, entry).toString('utf8');
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1] ?? ''));
}

/** Turns a column letter such as "AB" into a zero-based index. */
export function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, '').toUpperCase();
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

function parseRow(rowXml: string, shared: string[]): string[] {
  const cells: string[] = [];
  for (const match of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = match[1] ?? '';
    const inner = match[2] ?? '';
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
    const type = /\bt="(\w+)"/.exec(attrs)?.[1];
    const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    let value = '';
    if (type === 's' && raw !== undefined) value = shared[Number(raw)] ?? '';
    else if (type === 'inlineStr') value = textOf(inner);
    else if (raw !== undefined) value = decodeXml(raw);
    const index = ref ? columnIndex(ref) : cells.length;
    while (cells.length < index) cells.push('');
    cells[index] = value;
  }
  return cells;
}

/**
 * Reads the first worksheet. The header row is always kept; other rows are
 * kept only when `keep` returns true for them.
 */
export async function readSheet(
  xlsx: Buffer,
  keep: (cells: string[]) => boolean = () => true,
): Promise<string[][]> {
  const shared = readSharedStrings(xlsx);
  const sheet = findEntry(xlsx, /^xl\/worksheets\/sheet1\.xml$/i) ?? findEntry(xlsx, /^xl\/worksheets\/[^/]+\.xml$/i);
  if (!sheet) throw new Error('No worksheet found in the spreadsheet.');

  const rows: string[][] = [];
  let buffer = '';
  const decoder = new StringDecoder('utf8');
  const handle = (rowXml: string) => {
    const cells = parseRow(rowXml, shared);
    if (rows.length === 0 || keep(cells)) rows.push(cells);
  };

  for await (const chunk of streamEntry(xlsx, sheet)) {
    buffer += decoder.write(chunk as Buffer);
    let end: number;
    while ((end = buffer.indexOf('</row>')) >= 0) {
      const start = buffer.lastIndexOf('<row', end);
      handle(buffer.slice(start, end));
      buffer = buffer.slice(end + 6);
    }
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
