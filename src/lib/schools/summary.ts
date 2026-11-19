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
  return school.levels
    .filter((l) => l.awards > 0)
    .sort((a, b) => levelOrder(a.code) - levelOrder(b.code))
    .map((l) => l.name);
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
  return [...map.values()].sort((a, b) => levelOrder(a.code) - levelOrder(b.code));
}

/**
 * IPEDS award level codes from shortest to longest: certificates under 12
 * weeks (20), 12 weeks to 1 year (21), 1 to 2 years (2), associate's (3),
 * 2 to 4 years (4), bachelor's (5), postbaccalaureate (6), master's (7),
 * post-master's (8), doctor's (17 to 19).
 */
export function levelOrder(code: number): number {
  const order = [20, 21, 1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19];
  const i = order.indexOf(code);
  return i === -1 ? 100 + code : i;
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
export function inSentence(level: string): string {
  // "Certificate, 2 to less than 4 years" reads as "a certificate (2 to less than 4 years)".
  const [head, ...rest] = level.split(', ');
  const tidy = rest.length ? `${head} (${rest.join(', ')})` : level;
  const lower = tidy.charAt(0).toLowerCase() + tidy.slice(1);
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

/** Colleges with awards and total awards, for any group of colleges. */
export function schoolTotals(schools: School[]): { colleges: number; awards: number; zero: number } {
  const active = withAwards(schools);
  return {
    colleges: active.length,
    awards: active.reduce((sum, s) => sum + totalAwards(s), 0),
    zero: withoutAwards(schools).length,
  };
}

/** For example "354 colleges in the US reported 8,802 dental hygiene awards for 2023-24." */
export function nationalSchoolsSummary(schools: School[], year: string): string {
  const t = schoolTotals(schools);
  const places = new Set(withAwards(schools).map((s) => s.state));
  const states = [...places].filter((p) => p !== 'DC').length;
  const where = `${count.format(states)} ${states === 1 ? 'state' : 'states'}${places.has('DC') ? ' and DC' : ''}`;
  return `${count.format(t.colleges)} colleges in ${where} reported ${count.format(t.awards)} dental hygiene awards for ${year}.`;
}
