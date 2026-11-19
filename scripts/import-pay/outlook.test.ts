/** Tests for the job outlook import. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toRecords } from './csv.ts';
import { buildOutlook, fips, parseOutlookValue } from './outlook.ts';

// Made-up rows in the file's layout, for testing only.
const CSV = `state_fips,area,occupation_code,occupation_title,base_year,projected_year,base_employment,projected_employment,percent_change,average_annual_openings
00,United States,29-1292,Dental Hygienists,2024,2034,"1,000",1100,10,90
22,Louisiana,29-1292,Dental Hygienists,2024,2034,200,190,-5,10
6,California,29-1292,Dental Hygienists,2024,2034,300,300,0,0
48,Texas,29-1292,Dental Hygienists,2024,2034,400,,,`;

const known = [
  { code: '06', name: 'California' },
  { code: '22', name: 'Louisiana' },
  { code: '48', name: 'Texas' },
  { code: '56', name: 'Wyoming' },
];
const build = (csv = CSV) => buildOutlook(toRecords(parseCsv(csv)), { code: '29-1292', title: 'Dental Hygienists' }, known, 'test.csv', '2000-01-01');

test('reads negative, zero, decimal and comma numbers; a blank cell is not available', () => {
  assert.equal(parseOutlookValue('-1.7'), -1.7);
  assert.equal(parseOutlookValue('0'), 0);
  assert.equal(parseOutlookValue('0.1'), 0.1);
  assert.equal(parseOutlookValue('15,300'), 15300);
  assert.equal(parseOutlookValue(''), null);
  assert.equal(parseOutlookValue('*'), null);
  assert.equal(fips('6'), '06');
});

test('builds the national figures, the projection years and the source name', () => {
  const data = build();
  assert.deepEqual(data.national, { baseJobs: 1000, projectedJobs: 1100, percentChange: 10, openings: 90 });
  assert.equal(data.source.baseYear, 2024);
  assert.equal(data.source.projectedYear, 2034);
  assert.match(data.source.name, /^Projections Central, State Occupational Projections, long-term projections 2024 to 2034, sponsored by the US Department of Labor$/);
});

test('keeps a negative growth figure and a zero as published', () => {
  const data = build();
  const la = data.places.find((p) => p.name === 'Louisiana')!;
  assert.equal(la.figures.percentChange, -5);
  const ca = data.places.find((p) => p.name === 'California')!;
  assert.deepEqual(ca.figures, { baseJobs: 300, projectedJobs: 300, percentChange: 0, openings: 0 }, 'matched by FIPS code "6" -> "06"');
  const tx = data.places.find((p) => p.name === 'Texas')!;
  assert.deepEqual(tx.figures, { baseJobs: 400, projectedJobs: null, percentChange: null, openings: null });
});

test('lists a state missing from the file, and stops on an unknown FIPS code or missing national row', () => {
  assert.deepEqual(build().notInFile, ['Wyoming']);
  assert.throws(() => build(CSV.replace('48,Texas', '99,Atlantis')), /FIPS code 99/);
  assert.throws(() => build(CSV.replace(/\n00,United States[^\n]*/, '')), /no United States row/);
  assert.throws(() => build(CSV.replace(/29-1292/g, '29-9999')), /was not found/);
});
