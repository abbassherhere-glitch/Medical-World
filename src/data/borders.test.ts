/** Tests for the bordering-states list. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BORDERS } from './borders.ts';
import data from './pay/dental-hygienist.json' with { type: 'json' };

const statesAndDc = data.states.filter((s) => s.kind !== 'territory').map((s) => s.abbr);

test('lists every state and DC, and nothing else', () => {
  assert.equal(statesAndDc.length, 51);
  assert.deepEqual(Object.keys(BORDERS).sort(), [...statesAndDc].sort());
});

test('is two-way: if A lists B, B lists A', () => {
  for (const [state, neighbors] of Object.entries(BORDERS)) {
    for (const neighbor of neighbors) {
      assert.ok(BORDERS[neighbor]?.includes(state), `${state} lists ${neighbor}, but ${neighbor} does not list ${state}`);
    }
  }
});

test('has no state bordering itself and no repeats', () => {
  for (const [state, neighbors] of Object.entries(BORDERS)) {
    assert.ok(!neighbors.includes(state), `${state} lists itself`);
    assert.equal(new Set(neighbors).size, neighbors.length, `${state} lists a neighbor twice`);
  }
});

test('Alaska and Hawaii border no other state', () => {
  assert.deepEqual(BORDERS.AK, []);
  assert.deepEqual(BORDERS.HI, []);
});
