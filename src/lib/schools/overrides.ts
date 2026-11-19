/**
 * Applies the owner's overrides from src/data/schools/overrides.json: hide a
 * college, or correct its name, city, web address or type. A mistake stops
 * the build with a message, so an override is never silently ignored.
 */
import type { Control, SchoolsData } from './types.ts';

export interface SchoolOverride {
  profession: string;
  /** The college's IPEDS unit ID, as in the schools data file. */
  id: string;
  /** true to hide the college everywhere on the site. */
  hide?: boolean;
  /** Which detail to correct: "name", "city", "website" or "control". */
  field?: string;
  value?: string;
  note?: string;
}

const FIELDS = ['name', 'city', 'website', 'control'] as const;
const CONTROLS: Control[] = ['Public', 'Private nonprofit', 'Private for-profit'];

export function applySchoolOverrides(
  data: SchoolsData,
  profession: string,
  overrides: SchoolOverride[],
  knownProfessions: string[],
): SchoolsData {
  const result: SchoolsData = structuredClone(data);
  const hidden = new Set<string>();
  for (const o of overrides) {
    if (!knownProfessions.includes(o.profession)) {
      throw new Error(`School override names an unknown profession "${o.profession}". Known: ${knownProfessions.join(', ')}.`);
    }
    if (o.profession !== profession) continue;
    const school = result.schools.find((s) => s.id === String(o.id));
    if (!school) throw new Error(`School override names an unknown college ID "${o.id}". Use the "id" from the schools data file.`);
    if (o.hide === true) {
      hidden.add(school.id);
      continue;
    }
    if (!FIELDS.includes(o.field as (typeof FIELDS)[number])) {
      throw new Error(`School override for ${school.name}: set "hide": true, or a "field" of ${FIELDS.join(', ')}.`);
    }
    if (typeof o.value !== 'string' || o.value.trim() === '') {
      throw new Error(`School override for ${school.name} (${o.field}): the value must be some text.`);
    }
    if (o.field === 'control' && !CONTROLS.includes(o.value as Control)) {
      throw new Error(`School override for ${school.name}: the type must be one of ${CONTROLS.join(', ')}.`);
    }
    (school as unknown as Record<string, string>)[o.field!] = o.value.trim();
  }
  result.schools = result.schools.filter((s) => !hidden.has(s.id));
  return result;
}
