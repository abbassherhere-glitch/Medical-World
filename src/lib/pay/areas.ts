/**
 * Salary pages for metropolitan areas: which areas get a page, their page
 * addresses and short names, and the owner's publish switches.
 */
import { slugify } from '../../data/states.ts';
import { numeric } from './format.ts';
import type { AreaPay, PayData } from './types.ts';

/** One entry in src/data/area-names.json. */
export interface AreaName {
  code: string;
  /** The official area name, exactly as published. */
  name: string;
  /** A short name for titles and headings, for example "Houston, TX". */
  short: string;
}

export interface AreaPageSwitch {
  area: string;
  published: boolean;
}

export interface AreaPageRef {
  area: AreaPay;
  short: string;
  slug: string;
  /** For example "/dental-hygienist/salary/houston-pasadena-the-woodlands-tx/". */
  path: string;
  published: boolean;
}

/** Addresses already used under /{profession}/salary/, which an area must never take. */
export const RESERVED_SALARY_SLUGS = ['calculator', 'calculator-data.json', 'areas', 'cost-of-living'];

/**
 * Areas that get a page: metropolitan areas with a published annual median,
 * lying only in the 50 states and DC (territories have no pages on this site).
 */
export function areasWithPages(data: PayData): AreaPay[] {
  const statesAndDc = new Set(data.states.filter((s) => s.kind !== 'territory').map((s) => s.abbr));
  return data.areas.filter(
    (a) => a.kind === 'metro' && numeric(a.figures.annual.median) !== undefined && a.states.every((s) => statesAndDc.has(s)),
  );
}

/** The page address part for an area, made from its official name. */
export function areaSlug(name: string): string {
  return slugify(name);
}

/**
 * Matches every area that gets a page with its short name and publish
 * switch, and checks the files: every area listed once, official names
 * exactly as published, short names and addresses unique, and no address
 * that clashes with another salary page. Throws with a plain message if not.
 */
export function buildAreaPages(
  profession: string,
  areas: AreaPay[],
  names: AreaName[],
  switches: AreaPageSwitch[],
): AreaPageRef[] {
  const byCode = new Map(names.map((n) => [n.code, n]));
  const seenShort = new Map<string, string>();
  const seenSlug = new Map<string, string>();
  const known = new Set(areas.map((a) => a.name));

  const listed = new Map<string, boolean>();
  for (const entry of switches) {
    if (!known.has(entry.area)) {
      throw new Error(`Area page list for ${profession}: "${entry.area}" is not a metropolitan area with a page. Check the spelling against the official name.`);
    }
    if (listed.has(entry.area)) throw new Error(`Area page list for ${profession}: "${entry.area}" is listed twice.`);
    listed.set(entry.area, entry.published);
  }
  const missing = areas.filter((a) => !listed.has(a.name)).map((a) => a.name);
  if (missing.length) {
    throw new Error(`Area page list for ${profession} is missing: ${missing.join('; ')}. Add each with "published": true or false.`);
  }

  return areas.map((area) => {
    const entry = byCode.get(area.code);
    if (!entry) throw new Error(`Area names file has no short name for "${area.name}" (code ${area.code}).`);
    if (entry.name !== area.name) {
      throw new Error(`Area names file: code ${area.code} is "${entry.name}", but the official name is "${area.name}".`);
    }
    const short = entry.short.trim();
    if (!short) throw new Error(`Area names file: "${area.name}" has an empty short name.`);
    const otherShort = seenShort.get(short);
    if (otherShort) throw new Error(`Area names file: "${area.name}" and "${otherShort}" have the same short name "${short}".`);
    seenShort.set(short, area.name);

    const slug = areaSlug(area.name);
    if (RESERVED_SALARY_SLUGS.includes(slug)) throw new Error(`Area "${area.name}" would take the address of an existing page (${slug}).`);
    const otherSlug = seenSlug.get(slug);
    if (otherSlug) throw new Error(`Areas "${area.name}" and "${otherSlug}" would share the address "${slug}".`);
    seenSlug.set(slug, area.name);

    return { area, short, slug, path: `/${profession}/salary/${slug}/`, published: listed.get(area.name) === true };
  });
}
