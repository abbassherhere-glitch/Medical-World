/** The site's single way to read licensing facts, checked and with overrides applied. */
import type { LicensingData, LicensingEntry } from './types.ts';
import { loadLicensing, type LicensingOverride } from './validate.ts';
import { STATES_AND_DC } from '../../data/states.ts';
import overridesFile from '../../data/licensing/overrides.json';

const files = import.meta.glob<LicensingData>(['../../data/licensing/*.json', '!../../data/licensing/overrides.json'], {
  eager: true,
  import: 'default',
});
const overrides = (overridesFile as { overrides: LicensingOverride[] }).overrides;
const cache = new Map<string, LicensingData>();

export function getLicensing(profession: string): LicensingData | undefined {
  if (cache.has(profession)) return cache.get(profession);
  const file = Object.entries(files).find(([path]) => path.endsWith(`/${profession}.json`))?.[1];
  if (!file) return undefined;
  if (file.profession !== profession) throw new Error(`Licensing file for ${profession} says its profession is "${file.profession}".`);
  const data = loadLicensing(file, STATES_AND_DC, overrides.filter((o) => o.profession === profession));
  cache.set(profession, data);
  return data;
}

export function licensingFor(profession: string, state: string): LicensingEntry | undefined {
  return getLicensing(profession)?.states.find((s) => s.state === state);
}

export type { LicensingData, LicensingEntry };
export * from './content.ts';
