import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLicensing } from './validate.ts';
import { licensingQuestions, licensingSteps, licensingTakeaways, missingValues, factsIn, formatChecked, NOT_CONFIRMED } from './content.ts';
import type { LicensingData, LicensingEntry } from './types.ts';
import { STATES_AND_DC } from '../../data/states.ts';

const real = JSON.parse(readFileSync(new URL('../../data/licensing/dental-hygienist.json', import.meta.url), 'utf8')) as LicensingData;

const full: LicensingEntry = {
  state: 'Florida',
  board: { name: 'Board A', url: 'https://a.example.gov' },
  checked: '2026-11-20',
  reviewed_by_qualified_person: false,
  sources: ['https://a.example.gov/one'],
  first_license: {
    education: 'Edu.',
    national_exam: 'NBDHE.',
    clinical_exam: 'ADEX.',
    law_exam: 'Law exam.',
    other_requirements: ['Fingerprints.', 'CPR.'],
    fee: '$130.00.',
  },
  renewal: { period: 'Every two years.', fee: '$80.00.' },
  continuing_education: { hours: '24 hours.', required_topics: ['2 hours on errors.'], first_renewal: 'First renewal rule.' },
  notes: ['A note.'],
};
const gappy: LicensingEntry = {
  ...full,
  state: 'Virginia',
  first_license: { education: null, national_exam: null, clinical_exam: 'One of the regional clinical exams.', law_exam: null, other_requirements: [], fee: null },
  renewal: { period: 'Every year.', fee: null },
  continuing_education: { hours: null, required_topics: [], first_renewal: null },
  notes: [],
};
const file = (states: LicensingEntry[]): LicensingData => ({ about: 'a', profession: 'dental-hygienist', states });

test('the real file loads: 20 states, every source an https address, none reviewed', () => {
  const data = loadLicensing(real, STATES_AND_DC);
  assert.equal(data.states.length, 20);
  assert.ok(data.states.every((s) => s.reviewed_by_qualified_person === false));
});

test('the loader stops on an unknown state, a repeated state or a source that is not https', () => {
  assert.throws(() => loadLicensing(file([{ ...full, state: 'Atlantis' }]), STATES_AND_DC), /"Atlantis" is not a state on the site/);
  assert.throws(() => loadLicensing(file([full, full]), STATES_AND_DC), /"Florida" appears twice/);
  assert.throws(() => loadLicensing(file([{ ...full, sources: ['http://a.example.gov'] }]), STATES_AND_DC), /not an https address/);
  assert.throws(() => loadLicensing(file([{ ...full, sources: ['not a url'] }]), STATES_AND_DC), /not an https address/);
  assert.throws(() => loadLicensing(file([{ ...full, board: { name: 'B', url: 'ftp://x' } }]), STATES_AND_DC), /board's website/);
  assert.throws(() => loadLicensing(file([{ ...full, checked: '20 Nov 2026' }]), STATES_AND_DC), /YYYY-MM-DD/);
  assert.throws(() => loadLicensing(file([{ ...full, renewal: { period: '', fee: null } }]), STATES_AND_DC), /renewal.period must be text or null/);
});

test('overrides change one value, and stop on an unknown state or field', () => {
  const out = loadLicensing(file([full]), STATES_AND_DC, [
    { profession: 'dental-hygienist', state: 'Florida', field: 'renewal.fee', value: null },
    { profession: 'dental-hygienist', state: 'Florida', field: 'notes', value: [] },
  ]);
  assert.equal(out.states[0]!.renewal.fee, null);
  assert.deepEqual(out.states[0]!.notes, []);
  assert.equal(full.renewal.fee, '$80.00.', 'the original is unchanged');
  assert.throws(() => loadLicensing(file([full]), STATES_AND_DC, [{ profession: 'p', state: 'Ohio', field: 'renewal.fee', value: 'x' }]), /not in the licensing file/);
  assert.throws(() => loadLicensing(file([full]), STATES_AND_DC, [{ profession: 'p', state: 'Florida', field: 'renewal.cost', value: 'x' }]), /unknown field/);
  assert.throws(() => loadLicensing(file([full]), STATES_AND_DC, [{ profession: 'p', state: 'Florida', field: 'notes', value: 'x' }]), /must be a list/);
});

test('a state with every value: five steps, each showing the file text unchanged', () => {
  const steps = licensingSteps(full);
  assert.deepEqual(
    steps.map((s) => s.title),
    ['Education.', 'National board exam.', 'Clinical exam.', 'Application and fees.', 'Renewal.'],
  );
  assert.equal(steps[0]!.lines[0]!.text, 'Edu.');
  assert.deepEqual(steps[3]!.lines.map((l) => l.label), ['Law or jurisprudence exam', 'Other requirements', 'Fee']);
  assert.deepEqual(steps[3]!.lines[1]!.list, ['Fingerprints.', 'CPR.']);
  assert.deepEqual(steps[4]!.lines.map((l) => l.text ?? l.list), ['Every two years.', '$80.00.', '24 hours.', ['2 hours on errors.'], 'First renewal rule.']);
  assert.deepEqual(missingValues(full), []);
  assert.deepEqual(licensingTakeaways(full, 'Florida'), [
    'Fee for a first dental hygienist license in Florida: $130.00.',
    'License renewal in Florida: Every two years.',
  ]);
  assert.equal(licensingQuestions(full, 'Florida').length, 4);
  for (const q of licensingQuestions(full, 'Florida')) assert.ok(factsIn(full).includes(q.answer));
});

test('a state with several null values: they are listed as missing and questions are left out', () => {
  assert.deepEqual(missingValues(gappy), [
    'First license: education',
    'First license: national exam',
    'First license: law exam',
    'First license: other requirements',
    'First license: fee',
    'Renewal: fee',
    'Continuing education: hours',
    'Continuing education: required topics',
    'Continuing education: first renewal',
  ]);
  assert.equal(licensingSteps(gappy)[0]!.lines[0]!.text, null);
  assert.deepEqual(licensingTakeaways(gappy, 'Virginia'), ['License renewal in Virginia: Every year.']);
  assert.deepEqual(
    licensingQuestions(gappy, 'Virginia').map((q) => q.answer),
    ['One of the regional clinical exams.', 'Every year.'],
  );
  assert.equal(NOT_CONFIRMED, 'Not confirmed yet. Check with the board.');
});

test('a state not in the file has no entry', () => {
  const data = loadLicensing(real, STATES_AND_DC);
  assert.equal(data.states.find((s) => s.state === 'Oregon'), undefined);
});

test('the checked date reads in US style', () => {
  assert.equal(formatChecked('2026-11-20'), 'November 20, 2026');
});
