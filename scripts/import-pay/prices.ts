/**
 * Turns rows of the Regional Price Parities file into the site's price level
 * data. Works on rows already read, so it can be tested without the file.
 */
import type { PriceData, PriceLevel } from '../../src/lib/prices/types.ts';
import type { Row } from './extract.ts';
import { fips } from './outlook.ts';

const COLUMNS = ['state_fips', 'area', 'year', 'regional_price_parity_all_items'];

/** The release the owner supplied. The file itself does not carry its release date. */
export const PRICE_RELEASE = {
  publisher: 'US Bureau of Economic Analysis',
  table: 'Regional Price Parities by State',
  measure: 'all items',
  released: '2026-02-19',
  releasedText: 'February 19, 2026',
};

/** "US Bureau of Economic Analysis, Regional Price Parities by State, 2024 (all items), released February 19, 2026" */
export function priceSourceName(year: number): string {
  return `${PRICE_RELEASE.publisher}, ${PRICE_RELEASE.table}, ${year} (${PRICE_RELEASE.measure}), released ${PRICE_RELEASE.releasedText}`;
}

/** A price parity: a positive number such as "97.057". A blank cell or anything else is not available. */
export function parseParity(raw: string | undefined): number | null {
  const text = (raw ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return value > 0 ? value : null;
}

/**
 * Builds the price data. `knownPlaces` are the states and DC (code and name)
 * from the pay data, matched by FIPS code. Every one must be in the file.
 */
export function buildPrices(rows: Row[], knownPlaces: { code: string; name: string }[], fileRead: string, importedOn: string): PriceData {
  const header = Object.keys(rows[0] ?? {});
  const missingColumns = COLUMNS.filter((c) => !header.includes(c.toUpperCase()));
  if (missingColumns.length) throw new Error(`The price parities file is missing columns: ${missingColumns.join(', ')}.`);

  const years = new Set(rows.map((r) => r.YEAR?.trim()));
  if (years.size !== 1) throw new Error(`The price parities file should hold one year, but has: ${[...years].join(', ')}.`);
  const year = Number([...years][0]);
  if (!Number.isInteger(year)) throw new Error('The price parities file has no valid year.');

  const byCode = new Map<string, Row>();
  for (const row of rows) {
    const code = fips(row.STATE_FIPS);
    if (byCode.has(code)) throw new Error(`FIPS code ${code} appears twice in the price parities file.`);
    byCode.set(code, row);
  }

  const us = byCode.get('00');
  const national = parseParity(us?.REGIONAL_PRICE_PARITY_ALL_ITEMS);
  if (national === null) throw new Error('The price parities file has no United States row (FIPS 00).');

  const known = new Set(knownPlaces.map((p) => p.code));
  const unknown = [...byCode.keys()].filter((c) => c !== '00' && !known.has(c));
  if (unknown.length) throw new Error(`The price parities file has FIPS codes that are not states or DC: ${unknown.join(', ')}.`);

  const states: PriceLevel[] = knownPlaces.map((place) => {
    const row = byCode.get(place.code);
    if (!row) throw new Error(`The price parities file has no row for ${place.name} (FIPS ${place.code}).`);
    const area = row.AREA?.trim();
    if (area && area !== place.name) throw new Error(`FIPS ${place.code} is "${area}" in the price parities file but "${place.name}" in the pay data.`);
    return { code: place.code, name: place.name, parity: parseParity(row.REGIONAL_PRICE_PARITY_ALL_ITEMS) };
  });

  return {
    source: { name: priceSourceName(year), publisher: PRICE_RELEASE.publisher, year, released: PRICE_RELEASE.released, fileRead, importedOn },
    national,
    states,
  };
}
