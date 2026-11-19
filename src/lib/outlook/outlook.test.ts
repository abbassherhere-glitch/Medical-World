/** Tests for job outlook wording, ranking and overrides. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { growthRankInWords, formatJobChange, formatPercentChange, jobChange, outlookSentence, pace, rankByGrowth } from './summary.ts';
import { applyOutlookOverrides } from './overrides.ts';
import type { OutlookData, OutlookFigures } from './types.ts';

const f = (baseJobs: number | null, projectedJobs: number | null, percentChange: number | null, openings: number | null = 10): OutlookFigures => ({
  baseJobs,
  projectedJobs,
  percentChange,
  openings,
});
const us = f(221600, 237200, 7, 15300);
const years = '2024 to 2034';

test('compares growth with the national rate: faster, slower, about the same, level and falling', () => {
  assert.equal(pace(21.8, 7), 'faster');
  assert.equal(pace(1.9, 7), 'slower');
  assert.equal(pace(7.6, 7), 'same');
  assert.equal(pace(-1.7, 7), 'falling');
  assert.equal(pace(null, 7), 'unknown');
  assert.equal(outlookSentence('Texas', f(15550, 18950, 21.8), us, years), 'Jobs in Texas are projected to grow faster than the national rate from 2024 to 2034: +21.8% against +7% nationally.');
  assert.equal(outlookSentence('Louisiana', f(2770, 2720, -1.7), us, years), 'Jobs in Louisiana are projected to fall by 1.7% from 2024 to 2034, while nationally they are projected to grow by 7%.');
  assert.match(outlookSentence('Utopia', f(100, 100, 0), us, years), /stay about level .* \(0%\)/);
  assert.match(outlookSentence('Georgia', f(7330, 7870, 7.3), us, years), /about the same rate as the nation/);
  assert.equal(outlookSentence('Guam', undefined, us, years), 'There is no published job projection for Guam for 2024 to 2034.');
});

test('works out the change in jobs only when both counts are published', () => {
  assert.equal(jobChange(f(2770, 2720, -1.7)), -50);
  assert.equal(formatJobChange(jobChange(f(2770, 2720, -1.7))), '−50');
  assert.equal(formatJobChange(jobChange(f(15550, 18950, 21.8))), '+3,400');
  assert.equal(formatJobChange(jobChange(f(860, 860, 0.6))), '0');
  assert.equal(jobChange(f(400, null, null)), null);
  assert.equal(formatPercentChange(-1.7), '−1.7%');
  assert.equal(formatPercentChange(0), '0%');
  assert.equal(formatPercentChange(null), 'Not available');
});

test('ranks places by growth, sharing ranks on ties and leaving out missing figures', () => {
  const ranked = rankByGrowth([
    { code: '1', name: 'Idaho', figures: f(1, 1, 24.8) },
    { code: '2', name: 'Utah', figures: f(1, 1, 29.2) },
    { code: '3', name: 'Mississippi', figures: f(1, 1, 24.8) },
    { code: '4', name: 'Louisiana', figures: f(1, 1, -1.7) },
    { code: '5', name: 'Nowhere', figures: f(null, null, null) },
  ]);
  assert.deepEqual(ranked.map((r) => [r.name, r.rank]), [['Utah', 1], ['Idaho', 2], ['Mississippi', 2], ['Louisiana', 4]]);
});

test('overrides replace one figure, and a mistake stops the build', () => {
  const data: OutlookData = {
    occupation: { code: '', title: '' },
    source: { name: '', baseYear: 2024, projectedYear: 2034, fileRead: '', importedOn: '' },
    national: us,
    places: [{ code: '48', name: 'Texas', figures: f(15550, 18950, 21.8, 1370) }],
    notInFile: [],
  };
  const result = applyOutlookOverrides(data, 'p', [{ profession: 'p', place: 'Texas', figure: 'openings', value: 1400 }], ['p']);
  assert.equal(result.places[0]!.figures.openings, 1400);
  assert.equal(data.places[0]!.figures.openings, 1370, 'the original is unchanged');
  assert.equal(applyOutlookOverrides(data, 'p', [{ profession: 'p', place: 'United States', figure: 'percentChange', value: 'Not available' }], ['p']).national.percentChange, null);
  assert.throws(() => applyOutlookOverrides(data, 'p', [{ profession: 'p', place: 'Texsa', figure: 'openings', value: 1 }], ['p']), /unknown place/);
  assert.throws(() => applyOutlookOverrides(data, 'p', [{ profession: 'p', place: 'Texas', figure: 'growth', value: 1 }], ['p']), /unknown figure/);
});

test('describes a growth rank in words', () => {
  assert.equal(growthRankInWords({ rank: 5, of: 51 }), '5th fastest of 51');
  assert.equal(growthRankInWords({ rank: 1, of: 51 }), 'fastest of 51');
  assert.equal(growthRankInWords({ rank: 51, of: 51 }), 'slowest of 51');
  assert.equal(growthRankInWords({ rank: 12, of: 51 }), '12th fastest of 51');
});
