/** Tests for pay per hour, week, month and year. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPeriodAmount, payFor } from './periods.ts';
import type { PayFigures } from './types.ts';

// Made-up figures, for testing only.
const figures: PayFigures = {
  employment: 100,
  hourly: { mean: 47.59, p10: 36, p25: 40.18, median: 47.16, p75: 52.16, p90: { symbol: '#' } },
  annual: { mean: 98990, p10: 74880, p25: 83570, median: 98100, p75: { symbol: '*' }, p90: { symbol: '#' } },
};

test('per hour and per year are the official figures, as published', () => {
  assert.deepEqual(payFor(figures, 'median', 'hour'), { kind: 'value', amount: 47.16, calculated: false });
  assert.deepEqual(payFor(figures, 'median', 'year'), { kind: 'value', amount: 98100, calculated: false });
  assert.equal(formatPeriodAmount(payFor(figures, 'p10', 'hour'), 'hour'), '$36.00');
});

test('per week is the annual figure divided by 52, rounded to the nearest dollar', () => {
  // 98,100 / 52 = 1,886.538… -> 1,887 (rounds up)
  assert.deepEqual(payFor(figures, 'median', 'week'), { kind: 'value', amount: 1887, calculated: true });
  // 74,880 / 52 = 1,440 exactly
  assert.equal(formatPeriodAmount(payFor(figures, 'p10', 'week'), 'week'), '$1,440');
  // 83,570 / 52 = 1,607.115… -> 1,607 (rounds down)
  assert.equal(formatPeriodAmount(payFor(figures, 'p25', 'week'), 'week'), '$1,607');
});

test('per month is the annual figure divided by 12, rounded to the nearest dollar', () => {
  // 98,100 / 12 = 8,175 exactly
  assert.deepEqual(payFor(figures, 'median', 'month'), { kind: 'value', amount: 8175, calculated: true });
  // 83,570 / 12 = 6,964.166… -> 6,964
  assert.equal(formatPeriodAmount(payFor(figures, 'p25', 'month'), 'month'), '$6,964');
  // 98,990 / 12 = 8,249.166… -> 8,249
  assert.equal(formatPeriodAmount(payFor(figures, 'mean', 'month'), 'month'), '$8,249');
});

test('a missing figure stays missing for every period, with no arithmetic', () => {
  for (const period of ['year', 'week', 'month'] as const) {
    assert.deepEqual(payFor(figures, 'p75', period), { kind: 'missing' });
    assert.equal(formatPeriodAmount(payFor(figures, 'p75', period), period), 'Not available');
  }
  assert.deepEqual(payFor(undefined, 'median', 'week'), { kind: 'missing' }, 'a state with no figures at all');
});

test('a figure above the top pay level is shown as "At least"', () => {
  assert.equal(formatPeriodAmount(payFor(figures, 'p90', 'year'), 'year'), 'At least $239,200');
  assert.equal(formatPeriodAmount(payFor(figures, 'p90', 'hour'), 'hour'), 'At least $115.00');
  assert.equal(formatPeriodAmount(payFor(figures, 'p90', 'week'), 'week'), 'At least $4,600');
  // 239,200 / 12 = 19,933.33… -> 19,933
  assert.equal(formatPeriodAmount(payFor(figures, 'p90', 'month'), 'month'), 'At least $19,933');
});
