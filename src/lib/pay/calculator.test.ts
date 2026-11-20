/** Tests for the pay calculator. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalculatorData,
  difference,
  formatDifference,
  medianDifference,
  packFigures,
  readChoices,
  unpackFigures,
  writeChoices,
} from './calculator.ts';
import type { PayData, PayFigures } from './types.ts';

// Made-up figures, for testing only.
const figures = (median: number): PayFigures => ({
  employment: 100,
  hourly: { mean: 0, p10: 15, p25: 17, median: Math.round((median / 2080) * 100) / 100, p75: 23, p90: 26 },
  annual: { mean: 0, p10: 31200, p25: 35360, median, p75: 47840, p90: 54080 },
});

const pay: PayData = {
  occupation: { code: '00-0000', title: 'Sample' },
  release: { publisher: 'Test', survey: 'Survey', referencePeriod: 'May 2000', officialFiles: [], filesRead: [], sourceNote: '', importedOn: '' },
  symbols: {},
  national: figures(98100),
  states: [
    { code: '48', name: 'Texas', abbr: 'TX', kind: 'state', published: true, figures: figures(99240) },
    { code: '20', name: 'Kansas', abbr: 'KS', kind: 'state', published: false },
    { code: '05', name: 'Arkansas', abbr: 'AR', kind: 'state', published: true, figures: figures(86760) },
  ],
  areas: [
    { code: '12420', name: 'Austin, TX', kind: 'metro', states: ['TX'], primaryState: 'TX', figures: figures(105480) },
    { code: '45500', name: 'Texarkana, TX-AR', kind: 'metro', states: ['TX', 'AR'], primaryState: 'TX', figures: figures(82800) },
    { code: '45820', name: 'Topeka, KS', kind: 'metro', states: ['KS'], primaryState: 'KS', figures: figures(88220) },
  ],
};
const data = buildCalculatorData(
  pay,
  [
    { name: 'Texas', slug: 'texas' },
    { name: 'Kansas', slug: 'kansas' },
    { name: 'Arkansas', slug: 'arkansas' },
  ],
  'Survey, May 2000',
);

test('the data holds each state, its areas, and no statewide figures where there are none', () => {
  assert.deepEqual(data.states.find((s) => s.slug === 'texas')!.areas, ['12420', '45500']);
  assert.deepEqual(data.states.find((s) => s.slug === 'arkansas')!.areas, ['45500'], 'an area crossing a state line is in both');
  assert.equal(data.states.find((s) => s.slug === 'kansas')!.figures, undefined);
  assert.deepEqual(unpackFigures(packFigures(figures(99240))).annual.median, 99240);
  const packed = packFigures(figures(1));
  packed[1] = '*';
  assert.deepEqual(unpackFigures(packed).hourly.p10, { symbol: '*' }, 'a symbol survives packing');
});

test('the comparison difference: higher, lower, equal and one side missing', () => {
  const tx = figures(99240);
  const us = figures(98100);
  assert.deepEqual(medianDifference(tx, us, 'year'), { kind: 'higher', dollars: 1140, percent: 1140 / 98100 });
  assert.equal(formatDifference(medianDifference(tx, us, 'year'), 'year'), '$1,140 (1.2%) higher');
  assert.equal(formatDifference(medianDifference(us, tx, 'year'), 'year'), '$1,140 (1.1%) lower', 'percent of the other side');
  assert.equal(formatDifference(medianDifference(us, figures(98100), 'year'), 'year'), 'The same');
  assert.deepEqual(medianDifference(undefined, us, 'year'), { kind: 'missing' }, 'Kansas has no statewide figures');
  assert.equal(formatDifference(medianDifference(tx, undefined, 'month'), 'month'), 'Not available');
  // Weekly: 99,240/52 = 1,908 and 98,100/52 = 1,887, so $21 higher.
  assert.equal(formatDifference(medianDifference(tx, us, 'week'), 'week'), '$21 (1.1%) higher');
  // An "at least" figure gives no difference.
  assert.deepEqual(difference({ kind: 'atLeast', amount: 239200, calculated: false }, { kind: 'value', amount: 1, calculated: false }), {
    kind: 'missing',
  });
});

test('reads choices from the page address', () => {
  assert.deepEqual(readChoices('?state=texas&area=12420&vs=arkansas&vsarea=45500&per=month', data), {
    state: 'texas',
    area: '12420',
    compareState: 'arkansas',
    compareArea: '45500',
    period: 'month',
    ignored: [],
  });
  assert.deepEqual(readChoices('', data), { period: 'year', ignored: [] });
  assert.equal(readChoices('?state=TEXAS', data).state, 'texas', 'capital letters are fine');
});

test('ignores an unknown state, an area not in the chosen state, and an unknown period', () => {
  const choices = readChoices('?state=atlantis&area=12420&vs=kansas&vsarea=12420&per=fortnight', data);
  assert.equal(choices.state, undefined);
  assert.equal(choices.area, undefined);
  assert.equal(choices.compareState, 'kansas');
  assert.equal(choices.compareArea, undefined, 'Austin is not in Kansas');
  assert.equal(choices.period, 'year');
  assert.deepEqual(choices.ignored, ['state=atlantis', 'area=12420', 'vsarea=12420', 'per=fortnight']);
});

test('writes choices back into the page address', () => {
  assert.equal(writeChoices({ state: 'texas', area: '12420', period: 'year' }), '?state=texas&area=12420');
  assert.equal(writeChoices({ state: 'texas', compareState: 'kansas', period: 'hour' }), '?state=texas&vs=kansas&per=hour');
  assert.equal(writeChoices({ period: 'year' }), '');
  assert.equal(writeChoices({ area: '12420', period: 'year' }), '', 'an area without its state is left out');
});

import { priceSnapshot, snapshot } from './calculator.ts';

test('a snapshot shows every figure, the comparison and a text version of the range bar', () => {
  const snap = snapshot(figures(99240), figures(98100), 'the national median', 'year');
  assert.deepEqual(snap.rows.map((r) => r.value), ['$31,200', '$35,360', '$99,240', '$47,840', '$54,080']);
  assert.equal(snap.jobs, '100');
  assert.equal(snap.comparedWith, '$1,140 (1.2%) higher than the national median');
  assert.match(snap.barText, /lowest 10% earn less than \$31,200, half earn less than \$99,240/);
});

test('a snapshot for a place with no figures says so, with no range bar', () => {
  const snap = snapshot(undefined, figures(98100), 'the national median', 'month');
  assert.ok(snap.rows.every((r) => r.value === 'Not available'));
  assert.equal(snap.jobs, 'Not available');
  assert.equal(snap.comparedWith, 'Not available');
  assert.equal(snap.bar, undefined);
  assert.match(snap.barText, /not available/);
});

import { buildCalculatorOutlook, outlookSnapshot, unpackOutlook } from './calculator.ts';
import type { OutlookData } from '../outlook/types.ts';

const outlookData: OutlookData = {
  occupation: { code: '', title: '' },
  source: { name: 'Projections source', baseYear: 2024, projectedYear: 2034, fileRead: '', importedOn: '' },
  national: { baseJobs: 221600, projectedJobs: 237200, percentChange: 7, openings: 15300 },
  places: [
    { code: '48', name: 'Texas', figures: { baseJobs: 15550, projectedJobs: 18950, percentChange: 21.8, openings: 1370 } },
    { code: '05', name: 'Arkansas', figures: { baseJobs: 1810, projectedJobs: 2170, percentChange: 20.1, openings: 160 } },
  ],
  notInFile: [],
};
const years = { base: 2024, projected: 2034 };

test('the calculator outlook holds only published states, packed small', () => {
  const o = buildCalculatorOutlook(outlookData, [
    { name: 'Texas', slug: 'texas' },
    { name: 'Kansas', slug: 'kansas' },
  ]);
  assert.deepEqual(o.states, { texas: [15550, 18950, 21.8, 1370] });
  assert.deepEqual(unpackOutlook(o.national), outlookData.national);
  const byState: Record<string, (number | null)[] | undefined> = o.states;
  assert.equal(unpackOutlook(byState.kansas), undefined, 'Kansas is not in this sample file');
});

test('the outlook snapshot compares with the US, or with the first place in points', () => {
  const us = outlookData.national;
  const tx = outlookData.places[0]!.figures;
  const ar = outlookData.places[1]!.figures;
  const a = outlookSnapshot(tx, 'Texas', years, { figures: us, name: 'the US', isNation: true });
  assert.deepEqual(a, {
    heading: 'Job outlook for Texas, 2024 to 2034',
    jobs: '15,550 to 18,950',
    growth: '+21.8%',
    openings: '1,370',
    comparedWith: 'Faster than the US (+7%)',
  });
  assert.equal(outlookSnapshot(ar, 'Arkansas', years, { figures: tx, name: 'Texas', isNation: false }).comparedWith, '1.7 percentage points lower than Texas');
  assert.equal(outlookSnapshot({ ...tx, percentChange: -1.7 }, 'X', years, { figures: us, name: 'the US', isNation: true }).comparedWith, 'Falling, while the US grows +7%');
  assert.equal(outlookSnapshot(undefined, 'Guam', years, { figures: us, name: 'the US', isNation: true }).growth, 'Not available');
  assert.equal(outlookSnapshot(us, '', years, undefined).comparedWith, '–');
});

test('cost-of-living rows: whole states only, never areas, never from a missing salary', () => {
  const f = (median: number | { symbol: '*' }) =>
    ({ employment: 1, hourly: { mean: 1, p10: 1, p25: 1, median: 1, p75: 1, p90: 1 }, annual: { mean: 1, p10: 1, p25: 1, median, p75: 1, p90: 1 } }) as PayFigures;
  const texas = priceSnapshot('state', f(99240), 97.057);
  assert.equal(texas.priceLevel, '97.057');
  assert.equal(texas.adjusted, '$102,250');
  assert.equal(texas.value, 102250);
  const kansas = priceSnapshot('state', f({ symbol: '*' }), 90.068);
  assert.equal(kansas.adjusted, 'Not available');
  assert.equal(kansas.value, undefined);
  assert.equal(priceSnapshot('area', f(99240), 97.057).adjusted, 'Not for areas');
  assert.equal(priceSnapshot('nation', f(98100), 100).adjusted, '–');
  const ohio = priceSnapshot('state', f(88990), 92.774, { value: texas.value, name: 'Texas' });
  assert.equal(ohio.adjusted, '$95,920');
  assert.equal(ohio.comparedWith, '$6,330 (6.2%) lower than Texas');
  assert.equal(priceSnapshot('state', f(88990), 92.774, { value: undefined, name: 'Kansas' }).comparedWith, 'Not available');
});
