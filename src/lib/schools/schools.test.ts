/** Tests for the schools lists: sentences, sorting, links and overrides. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySchoolOverrides } from './overrides.ts';
import { inSentence, levelTotals, stateSchoolsSummary, websiteHref, withAwards, withoutAwards } from './summary.ts';
import type { School, SchoolsData } from './types.ts';

// Made-up colleges, for testing only.
const school = (id: string, name: string, levels: [number, string, number][], control: School['control'] = 'Public'): School => ({
  id,
  name,
  city: 'Town',
  state: 'TX',
  stateCode: '48',
  website: 'www.example.edu',
  control,
  levels: levels.map(([code, n, awards]) => ({ code, name: n, awards })),
});
const alpha = school('1', 'Alpha College', [[3, "Associate's degree", 20], [5, "Bachelor's degree", 4]]);
const beta = school('2', 'Beta Institute', [[3, "Associate's degree", 0]], 'Private for-profit');
const gamma = school('3', 'Gamma College', [[3, "Associate's degree", 24]]);

test('sorts by number of awards, then name, and keeps 0-award colleges apart', () => {
  assert.deepEqual(withAwards([gamma, beta, alpha]).map((s) => s.name), ['Alpha College', 'Gamma College']);
  assert.deepEqual(withoutAwards([gamma, beta, alpha]).map((s) => s.name), ['Beta Institute']);
  assert.deepEqual(levelTotals([alpha, gamma]), [
    { code: 3, name: "Associate's degree", awards: 44, colleges: 2 },
    { code: 5, name: "Bachelor's degree", awards: 4, colleges: 1 },
  ]);
});

test('writes the summary for several colleges, one college and none', () => {
  assert.equal(
    stateSchoolsSummary('Texas', [alpha, beta, gamma], '2023-24'),
    "2 colleges in Texas reported 48 dental hygiene awards for 2023-24, for an associate's degree or a bachelor's degree.",
  );
  assert.equal(
    stateSchoolsSummary('Alaska', [school('9', 'Solo University', [[5, "Bachelor's degree", 12]])], '2023-24'),
    "One college in Alaska, Solo University, reported 12 dental hygiene awards for 2023-24, for a bachelor's degree.",
  );
  assert.match(stateSchoolsSummary('Nowhere', [beta], '2023-24'), /No college in Nowhere reported .* One college reported the program with no awards/);
});

test('adds "https://" only to link an address that has none', () => {
  assert.equal(websiteHref('www.uaa.alaska.edu/'), 'https://www.uaa.alaska.edu/');
  assert.equal(websiteHref('https://calhoun.edu/'), 'https://calhoun.edu/');
  assert.equal(websiteHref('http://old.edu'), 'http://old.edu');
  assert.equal(websiteHref(''), undefined);
});

test('overrides hide a college or correct one detail, and a mistake stops the build', () => {
  const data: SchoolsData = {
    program: { cip: '51.0602', title: 'Dental Hygiene/Hygienist' },
    source: { name: 'Test', awardYear: '2023-24', fileRead: '', importedOn: '' },
    schools: [alpha, beta],
  };
  const hidden = applySchoolOverrides(data, 'p', [{ profession: 'p', id: '2', hide: true }], ['p']);
  assert.deepEqual(hidden.schools.map((s) => s.id), ['1']);
  const fixed = applySchoolOverrides(data, 'p', [{ profession: 'p', id: '1', field: 'name', value: 'Alpha State College' }], ['p']);
  assert.equal(fixed.schools[0]!.name, 'Alpha State College');
  assert.equal(data.schools[0]!.name, 'Alpha College', 'the original is unchanged');
  const run = (o: object) => () => applySchoolOverrides(data, 'p', [o as never], ['p']);
  assert.throws(run({ profession: 'p', id: '999', hide: true }), /unknown college ID/);
  assert.throws(run({ profession: 'p', id: '1', field: 'tuition', value: 'x' }), /set "hide": true, or a "field"/);
  assert.throws(run({ profession: 'p', id: '1', field: 'control', value: 'Charter' }), /type must be one of/);
  assert.throws(run({ profession: 'q', id: '1', hide: true }), /unknown profession/);
});

test('award levels read naturally in a sentence', () => {
  assert.equal(inSentence("Associate's degree"), "an associate's degree");
  assert.equal(inSentence('Certificate, 2 to less than 4 years'), 'a certificate (2 to less than 4 years)');
  assert.equal(inSentence('Postbaccalaureate certificate'), 'a postbaccalaureate certificate');
});
