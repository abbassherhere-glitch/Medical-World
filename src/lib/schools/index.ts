/**
 * The site's single way to read the schools lists, with overrides applied.
 * Only what the official file says is shown. Nothing here says or implies a
 * college is accredited, approved, recommended or accepting students.
 */
import type { School, SchoolsData } from './types.ts';
import { applySchoolOverrides, type SchoolOverride } from './overrides.ts';
import overridesFile from '../../data/schools/overrides.json';

const files = import.meta.glob<SchoolsData>(['../../data/schools/*.json', '!../../data/schools/overrides.json'], {
  eager: true,
  import: 'default',
});
const bySlug = new Map(Object.entries(files).map(([path, data]) => [path.replace(/^.*\/([^/]+)\.json$/, '$1'), data]));
const overrides = (overridesFile as { overrides: SchoolOverride[] }).overrides;
const cache = new Map<string, SchoolsData>();

export function getSchools(profession: string): SchoolsData | undefined {
  if (cache.has(profession)) return cache.get(profession);
  const data = bySlug.get(profession);
  if (!data) return undefined;
  const result = applySchoolOverrides(data, profession, overrides, [...bySlug.keys()]);
  cache.set(profession, result);
  return result;
}

export function schoolsInState(data: SchoolsData, abbr: string): School[] {
  return data.schools.filter((s) => s.state === abbr);
}

/** "US Department of Education, …, Completions, 2023-24". */
export function schoolsSourceLine(data: SchoolsData): string {
  return `${data.source.name}, ${data.source.awardYear}`;
}

export type { School, SchoolsData };
export * from './summary.ts';
