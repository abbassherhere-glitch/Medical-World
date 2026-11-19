import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { areaSlug, areasWithPages, buildAreaPages, RESERVED_SALARY_SLUGS, type AreaName } from './areas.ts';
import type { AreaPay, PayData, PayFigures } from './types.ts';

const pay = JSON.parse(readFileSync(new URL('../../data/pay/dental-hygienist.json', import.meta.url), 'utf8')) as PayData;
const names = (JSON.parse(readFileSync(new URL('../../data/area-names.json', import.meta.url), 'utf8')) as { areas: AreaName[] }).areas;
const switches = (
  JSON.parse(readFileSync(new URL('../../content/area-pages/dental-hygienist.json', import.meta.url), 'utf8')) as {
    pages: { area: string; published: boolean }[];
  }
).pages;
const real = areasWithPages(pay);

test('only metropolitan areas in the states and DC with an annual median get a page', () => {
  assert.ok(real.length > 300);
  assert.ok(real.every((a) => a.kind === 'metro'));
  assert.ok(!real.some((a) => a.states.includes('PR')));
  assert.ok(real.some((a) => a.states.length > 1), 'multi-state areas are included');
});

test('the real files match: every area has a unique short name and a unique, safe address', () => {
  const pages = buildAreaPages('dental-hygienist', real, names, switches);
  assert.equal(pages.length, real.length);
  assert.equal(new Set(pages.map((p) => p.slug)).size, pages.length);
  assert.equal(new Set(pages.map((p) => p.short)).size, pages.length);
  assert.ok(pages.every((p) => !RESERVED_SALARY_SLUGS.includes(p.slug)));
  assert.ok(pages.every((p) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)));
  const houston = pages.find((p) => p.area.name === 'Houston-Pasadena-The Woodlands, TX')!;
  assert.equal(houston.path, '/dental-hygienist/salary/houston-pasadena-the-woodlands-tx/');
  assert.equal(houston.short, 'Houston, TX');
});

test('an area that crosses state lines has one page, with every state in its short name', () => {
  const pages = buildAreaPages('dental-hygienist', real, names, switches);
  const dc = pages.filter((p) => p.area.name === 'Washington-Arlington-Alexandria, DC-VA-MD-WV');
  assert.equal(dc.length, 1);
  assert.equal(dc[0]!.short, 'Washington, DC-VA-MD-WV');
  assert.deepEqual(dc[0]!.area.states, ['DC', 'VA', 'MD', 'WV']);
});

test('city names with hyphens are kept whole in short names', () => {
  const short = (name: string) => names.find((n) => n.name === name)?.short;
  assert.equal(short('Winston-Salem, NC'), 'Winston-Salem, NC');
  assert.equal(short('Scranton--Wilkes-Barre, PA'), 'Scranton, PA');
  assert.equal(short('Nashville-Davidson--Murfreesboro--Franklin, TN'), 'Nashville-Davidson, TN');
  assert.equal(short('Lexington-Fayette, KY'), 'Lexington-Fayette, KY');
  assert.equal(short('Athens-Clarke County, GA'), 'Athens-Clarke County, GA');
});

test('addresses are made from the official name', () => {
  assert.equal(areaSlug("Coeur d'Alene, ID"), 'coeur-d-alene-id');
  assert.equal(areaSlug('St. Louis, MO-IL'), 'st-louis-mo-il');
  assert.equal(areaSlug('Nashville-Davidson--Murfreesboro--Franklin, TN'), 'nashville-davidson-murfreesboro-franklin-tn');
});

const figures = { employment: 10, hourly: { mean: 1, p10: 1, p25: 1, median: 1, p75: 1, p90: 1 }, annual: { mean: 1, p10: 1, p25: 1, median: 1, p75: 1, p90: 1 } } as PayFigures;
const area = (code: string, name: string, states = ['TX']): AreaPay => ({ code, name, kind: 'metro', states, primaryState: states[0]!, figures });
const two = [area('1', 'Alpha, TX'), area('2', 'Beta, TX-OK', ['TX', 'OK'])];
const twoNames: AreaName[] = [
  { code: '1', name: 'Alpha, TX', short: 'Alpha, TX' },
  { code: '2', name: 'Beta, TX-OK', short: 'Beta, TX-OK' },
];

test('a publish switch set to off leaves the page unpublished', () => {
  const pages = buildAreaPages('p', two, twoNames, [
    { area: 'Alpha, TX', published: true },
    { area: 'Beta, TX-OK', published: false },
  ]);
  assert.deepEqual(
    pages.filter((p) => p.published).map((p) => p.area.name),
    ['Alpha, TX'],
  );
});

test('the build stops on a bad file', () => {
  const on = [
    { area: 'Alpha, TX', published: true },
    { area: 'Beta, TX-OK', published: true },
  ];
  assert.throws(() => buildAreaPages('p', two, twoNames, [on[0]!]), /missing: Beta, TX-OK/);
  assert.throws(() => buildAreaPages('p', two, twoNames, [...on, on[0]!]), /listed twice/);
  assert.throws(() => buildAreaPages('p', two, twoNames, [...on, { area: 'Gamma, TX', published: true }]), /not a metropolitan area/);
  assert.throws(() => buildAreaPages('p', two, [twoNames[0]!, { ...twoNames[1]!, short: 'Alpha, TX' }], on), /same short name/);
  assert.throws(() => buildAreaPages('p', two, [twoNames[0]!, { ...twoNames[1]!, name: 'Beta, TX' }], on), /official name is "Beta, TX-OK"/);
  assert.throws(() => buildAreaPages('p', two, [twoNames[0]!], on), /no short name for "Beta, TX-OK"/);
  const clash = [area('1', 'Calculator'), area('2', 'Beta, TX-OK', ['TX', 'OK'])];
  assert.throws(
    () => buildAreaPages('p', clash, [{ code: '1', name: 'Calculator', short: 'C' }, twoNames[1]!], [{ area: 'Calculator', published: true }, on[1]!]),
    /address of an existing page/,
  );
  const same = [area('1', 'Alpha, TX'), area('3', 'Alpha TX')];
  assert.throws(
    () =>
      buildAreaPages(
        'p',
        same,
        [twoNames[0]!, { code: '3', name: 'Alpha TX', short: 'Alpha 2' }],
        [on[0]!, { area: 'Alpha TX', published: true }],
      ),
    /share the address/,
  );
});
