import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrices, parseParity, priceSourceName } from './prices.ts';
import type { Row } from './extract.ts';

const row = (fips: string, area: string, value: string, year = '2024'): Row => ({
  STATE_FIPS: fips,
  AREA: area,
  YEAR: year,
  REGIONAL_PRICE_PARITY_ALL_ITEMS: value,
});
const places = [
  { code: '01', name: 'Alabama' },
  { code: '11', name: 'District of Columbia' },
  { code: '48', name: 'Texas' },
];
const rows = [row('00', 'United States', '100.000'), row('1', 'Alabama', '88.823'), row('11', 'District of Columbia', '109.901'), row('48', 'Texas', '97.057')];

test('reads price levels, matched by FIPS code, with the source and release date', () => {
  const data = buildPrices(rows, places, 'file.csv', '2026-11-20');
  assert.equal(data.national, 100);
  assert.deepEqual(
    data.states.map((s) => [s.name, s.parity]),
    [
      ['Alabama', 88.823],
      ['District of Columbia', 109.901],
      ['Texas', 97.057],
    ],
  );
  assert.equal(data.source.year, 2024);
  assert.equal(data.source.released, '2026-02-19');
  assert.equal(data.source.name, 'US Bureau of Economic Analysis, Regional Price Parities by State, 2024 (all items), released February 19, 2026');
  assert.equal(priceSourceName(2024), data.source.name);
});

test('a blank or odd value is not available, never a number', () => {
  assert.equal(parseParity(''), null);
  assert.equal(parseParity('(NA)'), null);
  assert.equal(parseParity('0'), null);
  assert.equal(parseParity(' 97.057 '), 97.057);
});

test('the import stops on a bad file', () => {
  assert.throws(() => buildPrices(rows.slice(1), places, 'f', 'd'), /no United States row/);
  assert.throws(() => buildPrices(rows.filter((r) => r.AREA !== 'Texas'), places, 'f', 'd'), /no row for Texas/);
  assert.throws(() => buildPrices([...rows, row('72', 'Puerto Rico', '80')], places, 'f', 'd'), /not states or DC: 72/);
  assert.throws(() => buildPrices([...rows.slice(0, 3), row('48', 'Utah', '97')], places, 'f', 'd'), /"Utah" in the price parities file but "Texas"/);
  assert.throws(() => buildPrices([...rows, row('48', 'Texas', '97')], places, 'f', 'd'), /appears twice/);
  assert.throws(() => buildPrices([...rows.slice(0, 3), row('48', 'Texas', '97', '2023')], places, 'f', 'd'), /one year/);
  assert.throws(() => buildPrices([{ STATE_FIPS: '00' }], places, 'f', 'd'), /missing columns/);
});
