/** Words and numbers for the schools lists, worked out from the data. */
import type { Control, School } from './types.ts';

const count = new Intl.NumberFormat('en-US');

/** Total awards a college reported, across its award levels. */
export function totalAwards(school: School): number {
  return school.levels.reduce((sum, l) => sum + l.awards, 0);
}

/** Colleges that reported at least one award, most awards first, then by name. */
export function withAwards(schools: School[]): School[] {
  return schools
    .filter((s) => totalAwards(s) > 0)
    .sort((a, b) => totalAwards(b) - totalAwards(a) || a.name.localeCompare(b.name));
}

/** Colleges that reported the program but no awards in the year, by name. */
export function withoutAwards(schools: School[]): School[] {
  return schools.filter((s) => totalAwards(s) === 0).sort((a, b) => a.name.localeCompare(b.name));
}

/** The award levels with at least one award, for example "Associate's degree (26)". */
export function levelsWithAwards(school: School): string[] {
  return school.levels.filter((l) => l.awards > 0).map((l) => l.name);
}

/** Every award level with awards across these colleges, in the file's order, with totals. */
export function levelTotals(schools: School[]): { code: number; name: string; awards: number; colleges: number }[] {
  const map = new Map<number, { code: number; name: string; awards: number; colleges: number }>();
  for (const s of schools) {
    for (const l of s.levels) {
      if (l.awards === 0) continue;
      const entry = map.get(l.code) ?? { code: l.code, name: l.name, awards: 0, colleges: 0 };
      entry.awards += l.awards;
      entry.colleges += 1;
      map.set(l.code, entry);
    }
  }
  return [...map.values()].sort((a, b) => a.code - b.code);
}

export function controlTotals(schools: School[]): { control: Control; colleges: number; awards: number }[] {
  const order: Control[] = ['Public', 'Private nonprofit', 'Private for-profit'];
  return order
    .map((control) => {
      const mine = schools.filter((s) => s.control === control && totalAwards(s) > 0);
      return { control, colleges: mine.length, awards: mine.reduce((sum, s) => sum + totalAwards(s), 0) };
    })
    .filter((c) => c.colleges > 0);
}

/** "public", "private nonprofit" or "private for-profit". */
export function controlLabel(control: Control): string {
  return control.toLowerCase();
}

/** Lowercases the first letter of an award name for use in a sentence: "an associate's degree". */
function inSentence(level: string): string {
  const lower = level.charAt(0).toLowerCase() + level.slice(1);
  return /^[aeiou]/i.test(lower) ? `an ${lower}` : `a ${lower}`;
}

function joinList(items: string[], word = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

/**
 * One or two sentences about a state's colleges, for example "11 colleges in
 * Texas reported 642 dental hygiene awards in 2023-24, for an associate's
 * degree or a bachelor's degree."
 */
export function stateSchoolsSummary(place: string, schools: School[], year: string): string {
  const active = withAwards(schools);
  const zero = withoutAwards(schools);
  if (active.length === 0) {
    return zero.length
      ? `No college in ${place} reported dental hygiene awards for ${year}. ${zero.length === 1 ? 'One college' : `${count.format(zero.length)} colleges`} reported the program with no awards that year.`
      : `No college in ${place} reported dental hygiene awards for ${year}.`;
  }
  const total = active.reduce((sum, s) => sum + totalAwards(s), 0);
  const levels = levelTotals(active).map((l) => inSentence(l.name));
  const who = active.length === 1 ? `One college in ${place}, ${active[0]!.name},` : `${count.format(active.length)} colleges in ${place}`;
  return `${who} reported ${count.format(total)} dental hygiene ${total === 1 ? 'award' : 'awards'} for ${year}, for ${joinList(levels, 'or')}.`;
}

/**
 * The address to link to. Addresses in the file often have no "https://";
 * one is added only so the link works. The address itself is not changed.
 */
export function websiteHref(website: string): string | undefined {
  const text = website.trim();
  if (text === '') return undefined;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

export { count as countFormat };
