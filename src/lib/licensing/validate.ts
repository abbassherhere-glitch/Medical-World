/**
 * Checks the licensing file and applies the owner's overrides. Any problem
 * stops the build with a plain message. Works on data already read, so it
 * can be tested without the file.
 */
import type { LicensingData, LicensingEntry } from './types.ts';

const TEXT_FIELDS = [
  'first_license.education',
  'first_license.national_exam',
  'first_license.clinical_exam',
  'first_license.law_exam',
  'first_license.fee',
  'renewal.period',
  'renewal.fee',
  'continuing_education.hours',
  'continuing_education.first_renewal',
] as const;
const LIST_FIELDS = ['first_license.other_requirements', 'continuing_education.required_topics', 'notes'] as const;
export const OVERRIDE_FIELDS = [...TEXT_FIELDS, ...LIST_FIELDS, 'board.name', 'board.url'] as const;

export interface LicensingOverride {
  /** For example "dental-hygienist". */
  profession: string;
  state: string;
  /** For example "first_license.fee" or "renewal.period". */
  field: string;
  /** Text, a list of texts, or null for "not confirmed yet". */
  value: string | string[] | null;
  note?: string;
}

const isHttps = (url: unknown) => {
  if (typeof url !== 'string') return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

function get(entry: LicensingEntry, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], entry);
}

function set(entry: LicensingEntry, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  const parent = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, entry as unknown as Record<string, unknown>);
  parent[last] = value;
}

/** Checks one entry's shape and values. */
function checkEntry(entry: LicensingEntry, where: string): void {
  if (!entry.board || typeof entry.board.name !== 'string' || !entry.board.name.trim()) throw new Error(`${where}: the board has no name.`);
  if (!isHttps(entry.board.url)) throw new Error(`${where}: the board's website "${entry.board.url}" is not an https address.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.checked ?? '') || Number.isNaN(Date.parse(entry.checked))) {
    throw new Error(`${where}: "checked" must be a date written as YYYY-MM-DD.`);
  }
  if (typeof entry.reviewed_by_qualified_person !== 'boolean') throw new Error(`${where}: "reviewed_by_qualified_person" must be true or false.`);
  if (!Array.isArray(entry.sources) || entry.sources.length === 0) throw new Error(`${where}: there are no sources.`);
  for (const source of entry.sources) {
    if (!isHttps(source)) throw new Error(`${where}: the source "${source}" is not an https address.`);
  }
  for (const field of TEXT_FIELDS) {
    const value = get(entry, field);
    if (value !== null && (typeof value !== 'string' || !value.trim())) {
      throw new Error(`${where}: ${field} must be text or null (use null when it is not confirmed).`);
    }
  }
  for (const field of LIST_FIELDS) {
    const value = get(entry, field);
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !v.trim())) {
      throw new Error(`${where}: ${field} must be a list of texts (an empty list when none are confirmed).`);
    }
  }
}

/**
 * Checks the file against the states on the site, applies overrides and
 * returns the result. `knownStates` are the 50 states and DC.
 */
export function loadLicensing(data: LicensingData, knownStates: string[], overrides: LicensingOverride[] = []): LicensingData {
  const result: LicensingData = structuredClone(data);
  if (!Array.isArray(result.states)) throw new Error('The licensing file has no "states" list.');
  const seen = new Set<string>();
  for (const entry of result.states) {
    const name = entry.state;
    if (!knownStates.includes(name)) throw new Error(`Licensing file: "${name}" is not a state on the site. Check the spelling.`);
    if (seen.has(name)) throw new Error(`Licensing file: "${name}" appears twice.`);
    seen.add(name);
  }

  for (const o of overrides) {
    const entry = result.states.find((s) => s.state === o.state);
    if (!entry) throw new Error(`Licensing override names a state that is not in the licensing file: "${o.state}".`);
    if (!(OVERRIDE_FIELDS as readonly string[]).includes(o.field)) {
      throw new Error(`Licensing override for ${o.state} names an unknown field "${o.field}". Use one of: ${OVERRIDE_FIELDS.join(', ')}.`);
    }
    const isList = (LIST_FIELDS as readonly string[]).includes(o.field);
    if (isList && !Array.isArray(o.value)) throw new Error(`Licensing override for ${o.state} (${o.field}): the value must be a list.`);
    if (!isList && Array.isArray(o.value)) throw new Error(`Licensing override for ${o.state} (${o.field}): the value must be text or null.`);
    set(entry, o.field, o.value);
  }

  for (const entry of result.states) checkEntry(entry, `Licensing file, ${entry.state}`);
  return result;
}
