import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLicensingPage } from './licensing-rules.ts';
import type { LicensingEntry } from '../../src/lib/licensing/types.ts';

const entry: LicensingEntry = {
  state: 'Texas',
  board: { name: 'Board', url: 'https://b.example.gov' },
  checked: '2026-11-20',
  reviewed_by_qualified_person: false,
  sources: ['https://b.example.gov/a'],
  first_license: { education: 'Edu.', national_exam: null, clinical_exam: null, law_exam: null, other_requirements: [], fee: '$125.' },
  renewal: { period: null, fee: null },
  continuing_education: { hours: null, required_topics: [], first_renewal: null },
  notes: [],
};
const facts = new Set(['Edu.', '$125.', 'Board', 'Other state fact.']);
const state = { entry, where: 'Texas' };

test('passes when every fact shown is in the file', () => {
  const html =
    '<span data-licensing-fact>Edu.</span><li>Fee for a first dental hygienist license in Texas: $125.</li>' +
    '<details class="faq__item"><summary>How much does a first dental hygienist license cost in Texas?</summary><p>$125.</p></details>';
  assert.deepEqual(checkLicensingPage(html, facts, state), []);
});

test('fails on a fact not in the file, a fact from another state, a changed takeaway or answer, or a leftover placeholder', () => {
  assert.match(checkLicensingPage('<span data-licensing-fact>Edu, reworded.</span>', facts, state).join(), /not in the file: "Edu, reworded."/);
  assert.match(checkLicensingPage('<td data-licensing-fact>Other state fact.</td>', facts, state).join(), /from another state/);
  assert.match(checkLicensingPage('<li>Fee for a first dental hygienist license in Texas: $130.</li>', facts, state).join(), /takeaway not in the file/);
  assert.match(
    checkLicensingPage('<summary>How much does a first dental hygienist license cost in Texas?</summary><p>About $125.</p>', facts, state).join(),
    /is not in the file: "About \$125."/,
  );
  assert.match(checkLicensingPage('<p>[Requirement in Texas, from the state board.]</p>', facts, state).join(), /placeholder/);
});

test('a state not in the file must keep its placeholders', () => {
  assert.deepEqual(checkLicensingPage('<p>[Requirement in Oregon, from the state board.]</p>', facts, { where: 'Oregon' }), []);
  assert.match(checkLicensingPage('<p>Nothing</p>', facts, { where: 'Oregon' }).join(), /lost its licensing placeholders/);
});
