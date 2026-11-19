/** Tests for the state page published switch. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillState, publishedStates } from './publishing.ts';

const known = ['Alabama', 'Alaska', 'District of Columbia'];

test('all switches on: every state is published', () => {
  const list = known.map((state) => ({ state, published: true }));
  assert.deepEqual(publishedStates(list, known, 'test'), known);
});

test('a switch set to off leaves that state out', () => {
  const list = [
    { state: 'Alabama', published: true },
    { state: 'Alaska', published: false },
    { state: 'District of Columbia', published: true },
  ];
  assert.deepEqual(publishedStates(list, known, 'test'), ['Alabama', 'District of Columbia']);
});

test('a misspelled, repeated or missing state stops the build', () => {
  const base = known.map((state) => ({ state, published: true }));
  assert.throws(() => publishedStates([...base, { state: 'Alabamma', published: true }], known, 'test'), /not a state/);
  assert.throws(() => publishedStates([...base, { state: 'Alaska', published: false }], known, 'test'), /listed twice/);
  assert.throws(() => publishedStates(base.slice(1), known, 'test'), /missing: Alabama/);
});

test('fills the state name into every piece of text', () => {
  const filled = fillState({ heading: 'Pay in {state}', list: ['[{state} rule]'], count: 2, flag: true }, 'Ohio');
  assert.deepEqual(filled, { heading: 'Pay in Ohio', list: ['[Ohio rule]'], count: 2, flag: true });
});
