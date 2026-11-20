import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustedSalary, adjustNote, priceLevelInWords } from './adjust.ts';
import { applyPriceOverrides } from './overrides.ts';
import type { PriceData } from './types.ts';
import { costOfLivingTable } from './table.ts';
import type { StatePay } from '../pay/types.ts';

test('adjusted salary: median ÷ (parity ÷ 100), rounded to the nearest $10', () => {
  assert.equal(adjustedSalary(99240, 97.057), 102250); // 99,240 ÷ 0.97057 = 102,249.1
  assert.equal(adjustedSalary(137220, 109.901), 124860); // 124,857.8
  assert.equal(adjustedSalary(100000, 100), 100000);
  assert.equal(adjustedSalary(100004, 100), 100000);
  assert.equal(adjustedSalary(100005, 100), 100010);
});

test('adjusted salary is never worked out from a missing figure or a symbol', () => {
  assert.equal(adjustedSalary(undefined, 90.068), undefined); // Kansas: no statewide salary
  assert.equal(adjustedSalary({ symbol: '*' }, 90.068), undefined);
  assert.equal(adjustedSalary({ symbol: '#' }, 90.068), undefined);
  assert.equal(adjustedSalary(90000, null), undefined);
  assert.equal(adjustedSalary(90000, undefined), undefined);
  assert.equal(adjustedSalary(90000, 0), undefined);
});

test('price level in words and the note', () => {
  assert.equal(priceLevelInWords(110.72), '10.7% above the national average');
  assert.equal(priceLevelInWords(86.937), '13.1% below the national average');
  assert.equal(priceLevelInWords(100), 'the same as the national average');
  const note = adjustNote({ payPeriod: 'May 2025', priceYear: 2024 });
  assert.match(note, /is a calculation/);
  assert.match(note, /divided by the state's price level/);
  assert.match(note, /May 2025/);
  assert.match(note, /2024/);
  assert.match(note, /whole state/);
});

const data: PriceData = {
  source: { name: 's', publisher: 'p', year: 2024, released: '2026-02-19', fileRead: 'f', importedOn: 'd' },
  national: 100,
  states: [
    { code: '48', name: 'Texas', parity: 97.057 },
    { code: '06', name: 'California', parity: 110.72 },
  ],
};

test('overrides change one price level or mark it not available', () => {
  const out = applyPriceOverrides(data, [
    { place: 'Texas', value: 98 },
    { place: 'California', value: 'Not available' },
  ]);
  assert.equal(out.states[0]!.parity, 98);
  assert.equal(out.states[1]!.parity, null);
  assert.equal(data.states[0]!.parity, 97.057, 'the original data is not changed');
  assert.throws(() => applyPriceOverrides(data, [{ place: 'Atlantis', value: 90 }]), /unknown place/);
  assert.throws(() => applyPriceOverrides(data, [{ place: 'Texas', value: -1 }]), /positive number/);
});

test('the cost-of-living table ranks before and after prices, and leaves out a state with no salary', () => {
  const pay = (name: string, median: number | undefined) =>
    ({
      code: name,
      name,
      abbr: name,
      kind: 'state',
      published: median !== undefined,
      figures:
        median === undefined
          ? undefined
          : { employment: 1, hourly: { mean: 1, p10: 1, p25: 1, median: 1, p75: 1, p90: 1 }, annual: { mean: 1, p10: 1, p25: 1, median, p75: 1, p90: 1 } },
    }) as StatePay;
  const prices: PriceData = {
    ...data,
    states: [
      { code: 'A', name: 'Dear', parity: 125 },
      { code: 'B', name: 'Cheap', parity: 80 },
      { code: 'C', name: 'Middle', parity: 100 },
      { code: 'D', name: 'NoPay', parity: 90 },
    ],
  };
  const rows = costOfLivingTable([pay('Dear', 120000), pay('Cheap', 80000), pay('Middle', 100000), pay('NoPay', undefined)], prices);
  assert.deepEqual(
    rows.map((r) => [r.name, r.adjusted, r.rank, r.adjustedRank, r.change]),
    [
      ['Cheap', 100000, 3, 1, 2],
      ['Middle', 100000, 2, 1, 1],
      ['Dear', 96000, 1, 3, -2],
    ],
  );
});
