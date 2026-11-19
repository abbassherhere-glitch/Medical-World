/** Tests for overrides and the wording shown for special values. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOverrides } from './overrides.ts';
import { formatAnnual, formatHourly, formatJobs, NOT_AVAILABLE } from './format.ts';
import type { PayData, PayFigures } from './types.ts';

// Made-up figures, for testing only.
const figures = (median: number): PayFigures => ({
  employment: 100,
  hourly: { mean: 20, p10: 15, p25: 17, median: median / 2080, p75: 23, p90: 26 },
  annual: { mean: 41600, p10: 31200, p25: 35360, median, p75: 47840, p90: 54080 },
});

const sample: PayData = {
  occupation: { code: '00-0000', title: 'Sample' },
  release: {
    publisher: 'Test',
    survey: 'Test survey',
    referencePeriod: 'May 2000',
    officialFiles: [],
    filesRead: [],
    sourceNote: '',
    importedOn: '2000-01-01',
  },
  symbols: {},
  national: figures(40000),
  states: [
    { code: '48', name: 'Texas', abbr: 'TX', kind: 'state', published: true, figures: figures(41000) },
    { code: '20', name: 'Kansas', abbr: 'KS', kind: 'state', published: false },
  ],
  areas: [{ code: '1', name: 'Sample City, TX', kind: 'metro', states: ['TX'], primaryState: 'TX', figures: figures(42000) }],
};

test('an empty overrides list changes nothing', () => {
  assert.deepEqual(applyOverrides(sample, 'sample', [], ['sample']), sample);
});

test('an override replaces one figure for one place only', () => {
  const result = applyOverrides(
    sample,
    'sample',
    [
      { profession: 'sample', place: 'Texas', figure: 'annual.median', value: 50000 },
      { profession: 'sample', place: 'Sample City, TX', figure: 'jobs', value: 'Not available' },
      { profession: 'sample', place: 'United States', figure: 'hourly.p90', value: 30 },
    ],
    ['sample'],
  );
  assert.equal(result.states[0]!.figures!.annual.median, 50000);
  assert.equal(result.states[0]!.figures!.annual.p10, 31200);
  assert.deepEqual(result.areas[0]!.figures.employment, { symbol: '**' });
  assert.equal(result.national.hourly.p90, 30);
  assert.equal(sample.states[0]!.figures!.annual.median, 41000, 'the original data is not changed');
});

test('a mistake in the overrides file stops the build', () => {
  const run = (o: object) => () => applyOverrides(sample, 'sample', [o as never], ['sample']);
  assert.throws(run({ profession: 'sample', place: 'Texsa', figure: 'jobs', value: 1 }), /unknown place/);
  assert.throws(run({ profession: 'sample', place: 'Texas', figure: 'annual.middle', value: 1 }), /unknown figure/);
  assert.throws(run({ profession: 'other', place: 'Texas', figure: 'jobs', value: 1 }), /unknown profession/);
  assert.throws(run({ profession: 'sample', place: 'Texas', figure: 'jobs', value: '1,000' }), /must be a number/);
  assert.throws(run({ profession: 'sample', place: 'Kansas', figure: 'jobs', value: 1 }), /no figures for this state/);
});

test('special values are shown in words, never as a blank or zero', () => {
  assert.equal(formatAnnual(98100), '$98,100');
  assert.equal(formatHourly(47.16), '$47.16');
  assert.equal(formatHourly(36), '$36.00');
  assert.equal(formatJobs(222740), '222,740');
  assert.equal(formatAnnual({ symbol: '*' }), NOT_AVAILABLE);
  assert.equal(formatJobs({ symbol: '**' }), NOT_AVAILABLE);
  assert.equal(formatAnnual(undefined), NOT_AVAILABLE);
  assert.equal(formatAnnual({ symbol: '#' }), 'At least $239,200');
  assert.equal(formatHourly({ symbol: '#' }), 'At least $115.00');
});

import { compareWithNational, highestAndLowest, joinNames, rankByMedian } from './summary.ts';

test('finds the highest and lowest paying states, listing ties together', () => {
  const states = [
    { code: '1', name: 'A', abbr: 'AA', kind: 'state' as const, published: true, figures: figures(50000) },
    { code: '2', name: 'B', abbr: 'BB', kind: 'state' as const, published: true, figures: figures(30000) },
    { code: '3', name: 'C', abbr: 'CC', kind: 'state' as const, published: true, figures: figures(50000) },
    { code: '4', name: 'D', abbr: 'DD', kind: 'state' as const, published: false },
  ];
  const result = highestAndLowest(states)!;
  assert.deepEqual(result.highest.map((s) => s.name), ['A', 'C']);
  assert.deepEqual(result.lowest.map((s) => s.name), ['B']);
  assert.equal(rankByMedian(states).length, 3, 'states without figures are left out');
  assert.equal(joinNames(['A', 'B', 'C']), 'A, B and C');
});

test('compares a state with the national median in one sentence', () => {
  assert.equal(
    compareWithNational('Texas', figures(99240), figures(98100)),
    'The median pay in Texas is $1,140 a year (1.2%) higher than the national median of $98,100.',
  );
  assert.equal(
    compareWithNational('Ohio', figures(88290), figures(98100)),
    'The median pay in Ohio is $9,810 a year (10.0%) lower than the national median of $98,100.',
  );
  assert.equal(compareWithNational('Kansas', undefined, figures(98100)), undefined);
});
