import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  areaQuestions,
  areaRank,
  areaRankSentence,
  compareMedian,
  nationalBenchmark,
  nextHigherAndLower,
  stateBenchmark,
} from './area-summary.ts';
import type { AreaPay, PayFigures, PayValue, StatePay } from './types.ts';

const figures = (median: PayValue, employment: PayValue = 100): PayFigures => {
  const p = (v: PayValue, h = false) => ({
    mean: v,
    p10: typeof v === 'number' ? v - 10000 : v,
    p25: v,
    median: typeof v === 'number' && h ? Math.round((v / 2080) * 100) / 100 : v,
    p75: v,
    p90: typeof v === 'number' ? v + 10000 : v,
  });
  return { employment, annual: p(median), hourly: p(median, true) };
};
const area = (code: string, name: string, median: PayValue, states = ['TX']): AreaPay => ({
  code,
  name,
  kind: 'metro',
  states,
  primaryState: states[0]!,
  figures: figures(median),
});
const texas: StatePay = { code: '48', name: 'Texas', abbr: 'TX', kind: 'state', published: true, figures: figures(99240) };
const kansas: StatePay = { code: '20', name: 'Kansas', abbr: 'KS', kind: 'state', published: false };
const dc: StatePay = { code: '11', name: 'District of Columbia', abbr: 'DC', kind: 'district', published: true, figures: figures(137220) };
const us = figures(98100);

const areas = [area('1', 'High, TX', 120000), area('2', 'Mid A, TX', 100000), area('3', 'Mid B, TX', 100000), area('4', 'Low, TX', 80000), area('5', 'None, TX', { symbol: '*' })];

test('comparison sentence: higher, lower, equal and missing', () => {
  assert.equal(
    compareMedian('High, TX', 120000, stateBenchmark(texas)),
    'The median salary in High, TX is $20,760 a year (20.9%) higher than the statewide median in Texas ($99,240).',
  );
  assert.equal(
    compareMedian('Low, TX', 80000, nationalBenchmark(us)),
    'The median salary in Low, TX is $18,100 a year (18.5%) lower than the US median ($98,100).',
  );
  assert.equal(compareMedian('Same, TX', 98100, nationalBenchmark(us)), 'The median salary in Same, TX is the same as the US median ($98,100 a year).');
  assert.equal(
    compareMedian('Topeka, KS', 90000, stateBenchmark(kansas)),
    'The survey publishes no statewide median for Kansas, so there is no state figure to compare with.',
  );
  assert.match(compareMedian('Washington, DC-VA-MD-WV', 120000, stateBenchmark(dc)), /statewide median in the District of Columbia/);
  assert.match(compareMedian('None, TX', undefined, nationalBenchmark(us)), /no published median for None, TX/);
});

test('rank among areas: ties share a rank, missing medians are left out', () => {
  assert.deepEqual(areaRank(areas, '1'), { rank: 1, of: 4 });
  assert.deepEqual(areaRank(areas, '2'), { rank: 2, of: 4 });
  assert.deepEqual(areaRank(areas, '3'), { rank: 2, of: 4 });
  assert.deepEqual(areaRank(areas, '4'), { rank: 4, of: 4 });
  assert.equal(areaRank(areas, '5'), undefined);
});

test('rank sentence names the state rank and the national rank', () => {
  assert.equal(
    areaRankSentence('Mid A, TX', [{ state: texas, rank: { rank: 2, of: 4 } }], { rank: 120, of: 377 }),
    'Mid A, TX ranks 2nd highest of 4 areas that include Texas and 120th highest of 377 metropolitan areas in the US by median salary.',
  );
  assert.equal(
    areaRankSentence('Burlington, VT', [{ state: { ...texas, name: 'Vermont' }, rank: { rank: 1, of: 1 } }], { rank: 1, of: 377 }),
    'Burlington, VT ranks highest of 377 metropolitan areas in the US by median salary. It is the only area that includes Vermont with published figures.',
  );
});

test('next higher and lower paying areas skip equal medians', () => {
  const n = nextHigherAndLower(areas, '2');
  assert.equal(n.higher?.name, 'High, TX');
  assert.equal(n.lower?.name, 'Low, TX');
  assert.equal(nextHigherAndLower(areas, '1').higher, undefined);
  assert.equal(nextHigherAndLower(areas, '4').lower, undefined);
});

test('common questions are answered from the area figures, and left out when missing', () => {
  const q = areaQuestions({
    place: 'High, TX',
    area: areas[0]!,
    states: [texas],
    national: us,
    stateRanks: [{ state: texas, rank: { rank: 1, of: 4 } }],
    nationalRank: { rank: 1, of: 10 },
    plural: 'dental hygienists',
    survey: 'the May 2025 survey',
  });
  assert.equal(q.length, 5);
  assert.match(q[0]!.answer, /\$120,000 a year/);
  assert.match(q[1]!.answer, /\$10,000 a month or \$2,308 a week/);
  assert.equal(q[3]!.question, 'How does High, TX rank for dental hygienist pay?');

  const noJobs = { ...areas[0]!, figures: { ...areas[0]!.figures, employment: { symbol: '**' as const } } };
  const fewer = areaQuestions({
    place: 'High, TX',
    area: noJobs,
    states: [kansas],
    national: us,
    stateRanks: [],
    nationalRank: undefined,
    plural: 'dental hygienists',
    survey: 'the May 2025 survey',
  });
  assert.ok(!fewer.some((x) => x.question.startsWith('How many')));
  assert.ok(!fewer.some((x) => x.question.includes('rank')));
  assert.match(fewer.find((x) => x.question.includes('compare'))!.answer, /no statewide median for Kansas/);
});
