import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salaryFigures, salaryLead, salaryTitle } from './salary-wording.ts';
import type { PayFigures, PayValue } from './types.ts';

const figures = (year: PayValue, hour: PayValue): PayFigures => {
  const p = (v: PayValue) => ({ mean: v, p10: v, p25: v, median: v, p75: v, p90: v });
  return { employment: 100, annual: p(year), hourly: p(hour) };
};
const source = 'US Bureau of Labor Statistics, Occupational Employment and Wage Statistics, May 2025';

test('salary title states the answer', () => {
  assert.equal(salaryTitle('Dental hygienist', 'Texas', figures(99240, 47.71)), 'Dental hygienist salary in Texas: $99,240 a year, $47.71 an hour');
  assert.equal(salaryTitle('Dental hygienist', 'Kansas', undefined), 'Dental hygienist salary in Kansas');
  assert.equal(salaryTitle('Dental hygienist', 'X', figures(90000, { symbol: '*' })), 'Dental hygienist salary in X: $90,000 a year');
});

test('salary lead gives the median with source, or nothing when missing', () => {
  assert.equal(
    salaryLead('dental hygienists', 'Texas', figures(99240, 47.71), source),
    `The median salary for dental hygienists in Texas is $99,240 a year, or $47.71 an hour (${source}).`,
  );
  assert.equal(salaryLead('dental hygienists', 'Kansas', figures({ symbol: '*' }, { symbol: '*' }), source), undefined);
  assert.equal(salaryFigures(figures({ symbol: '#' }, 50)), '$50.00 an hour');
});
