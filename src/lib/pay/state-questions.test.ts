/** Tests for the common questions on state pages. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stateQuestions, type QuestionInput } from './state-questions.ts';
import type { AreaPay, PayFigures, StatePay } from './types.ts';

// Made-up figures, for testing only.
const figures = (median: number, jobs = 1000): PayFigures => ({
  employment: jobs,
  hourly: { mean: 0, p10: 30, p25: 35, median: Math.round((median / 2080) * 100) / 100, p75: 50, p90: 55 },
  annual: { mean: 0, p10: 62400, p25: 72800, median, p75: 104000, p90: 114400 },
});
const st = (name: string, abbr: string, median?: number): StatePay =>
  median === undefined
    ? { code: abbr, name, abbr, kind: 'state', published: false }
    : { code: abbr, name, abbr, kind: 'state', published: true, figures: figures(median) };
const area = (name: string, median: number): AreaPay => ({ code: name, name, kind: 'metro', states: ['XX'], primaryState: 'XX', figures: figures(median) });

const texas = st('Texas', 'TX', 99240);
const kansas = st('Kansas', 'KS');
const rhode = st('Rhode Island', 'RI', 86910);
const all = [texas, kansas, rhode, st('Oklahoma', 'OK', 97580), st('Louisiana', 'LA', 85240), st('Colorado', 'CO', 109580), st('Massachusetts', 'MA', 100640)];
const base = { allStates: all, national: { ...figures(98100), employment: 222740 }, plural: 'dental hygienists', survey: 'the May 2025 survey' };
const ask = (input: Omit<QuestionInput, keyof typeof base>) => stateQuestions({ ...base, ...input });

test('a normal state gets six questions, all answered from its own figures', () => {
  const q = ask({ state: texas, areas: [area('Austin, TX', 105480), area('Longview, TX', 81920), area('Waco, TX', 95340)], neighbors: [all[3]!, all[4]!] });
  assert.equal(q.length, 6);
  assert.deepEqual(q.map((x) => x.question), [
    'How much do dental hygienists make in Texas?',
    'How does pay in Texas compare with the national median?',
    'Which area in Texas pays dental hygienists the most?',
    'How many dental hygienists work in Texas?',
    'How does Texas rank for dental hygienist pay?',
    'How does pay in Texas compare with nearby states?',
  ]);
  assert.match(q[0]!.answer, /median pay for dental hygienists in Texas is \$99,240 a year, or \$47\.71 an hour/);
  assert.match(q[1]!.answer, /\$1,140 a year \(1\.2%\) higher than the national median of \$98,100\. By the hour, the median is \$47\.71 in Texas, against \$47\.16 nationally/);
  assert.match(q[2]!.answer, /Of the 3 areas .* Austin, TX has the highest median pay, at \$105,480 .* The lowest is Longview, TX, at \$81,920/);
  assert.match(q[3]!.answer, /1,000 dental hygienist jobs in Texas, out of 222,740/);
  assert.match(q[4]!.answer, /Texas ranks 3rd highest of 6/);
  assert.match(q[5]!.answer, /Texas pays more than every state it borders/);
});

test('Kansas, with no statewide figures, gets only the questions the data can answer, answered honestly', () => {
  const q = ask({ state: kansas, areas: [area('Topeka, KS', 88220), area('Kansas City, MO-KS', 92750)], neighbors: [all[3]!, all[5]!] });
  assert.deepEqual(q.map((x) => x.question), [
    'How much do dental hygienists make in Kansas?',
    'Which area in Kansas pays dental hygienists the most?',
    'How does pay in Kansas compare with nearby states?',
  ]);
  assert.match(q[0]!.answer, /no statewide pay figures for dental hygienists in Kansas\. Median pay in the areas that include Kansas runs from \$88,220 in Topeka, KS to \$92,750 in Kansas City, MO-KS/);
  assert.match(q[2]!.answer, /no statewide figure for Kansas to compare\. Among its neighbors, Colorado has the highest median pay \(\$109,580 a year\) and Oklahoma the lowest/);
  assert.ok(!q.some((x) => /rank/.test(x.question)), 'Kansas is not ranked');
});

test('a state with only one area does not get the "which area pays most" question', () => {
  const q = ask({ state: rhode, areas: [area('Providence-Warwick, RI-MA', 89310)], neighbors: [all[6]!] });
  assert.equal(q.length, 5);
  assert.ok(!q.some((x) => x.question.startsWith('Which area')));
  assert.match(q[4]!.answer, /Rhode Island pays less than every state it borders/);
});

test('a state with no neighbors does not get the nearby states question', () => {
  const q = ask({ state: st('Hawaii', 'HI', 97570), areas: [], neighbors: [] });
  assert.ok(!q.some((x) => x.question.includes('nearby')));
  assert.ok(!q.some((x) => x.question.startsWith('Which area')));
});
