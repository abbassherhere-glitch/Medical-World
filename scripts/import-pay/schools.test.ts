/** Tests for the schools import. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toRecords } from './csv.ts';
import { buildSchools, parseAwards } from './schools.ts';

// Made-up colleges in the file's layout, for testing only.
const CSV = `unitid,institution,city,state,state_fips,website,control,award_level_code,award_level,cip_code,program,completions,award_year
1,"Alpha College","Austin",TX,48,"www.alpha.edu/","Public",3,"Associate's degree",51.0602,"Dental Hygiene/Hygienist",20,2023-24
1,"Alpha College","Austin",TX,48,"www.alpha.edu/","Public",5,"Bachelor's degree",51.0602,"Dental Hygiene/Hygienist",4,2023-24
2,"Beta Institute","Dallas",TX,48,"https://beta.edu","Private for-profit",3,"Associate's degree",51.0602,"Dental Hygiene/Hygienist",0,2023-24
3,"Gamma University","Anchorage",AK,2,"gamma.edu","Public",5,"Bachelor's degree",51.0602,"Dental Hygiene/Hygienist",12,2023-24
4,"Other Program","Austin",TX,48,"other.edu","Public",3,"Associate's degree",51.0601,"Dental Assisting",9,2023-24`;

const states = new Map([
  ['02', 'AK'],
  ['48', 'TX'],
]);
const build = (csv = CSV) => buildSchools(toRecords(parseCsv(csv)), '51.0602', states, 'test.csv', '2000-01-01');

test('groups a college with several award levels into one entry', () => {
  const alpha = build().schools.find((s) => s.id === '1')!;
  assert.deepEqual(alpha.levels, [
    { code: 3, name: "Associate's degree", awards: 20 },
    { code: 5, name: "Bachelor's degree", awards: 4 },
  ]);
  assert.equal(alpha.website, 'www.alpha.edu/', 'the address is kept exactly as in the file');
});

test('keeps a college with 0 awards, and only the program asked for', () => {
  const data = build();
  assert.deepEqual(data.schools.find((s) => s.id === '2')!.levels, [{ code: 3, name: "Associate's degree", awards: 0 }]);
  assert.ok(!data.schools.some((s) => s.id === '4'), 'another program code is left out');
  assert.equal(data.schools.length, 3);
});

test('matches a state with one college by FIPS code', () => {
  const ak = build().schools.filter((s) => s.state === 'AK');
  assert.equal(ak.length, 1);
  assert.equal(ak[0]!.stateCode, '02', 'FIPS "2" is read as "02"');
});

test('stops on an unknown FIPS code, a mismatched state, a bad count or a repeated level', () => {
  assert.throws(() => build(CSV.replace('AK,2,', 'AK,99,')), /FIPS code 99/);
  assert.throws(() => build(CSV.replace('"Anchorage",AK,2', '"Anchorage",TX,2')), /state column says TX/);
  assert.throws(() => build(CSV.replace(',12,2023-24', ',twelve,2023-24')), /Unexpected number of awards/);
  assert.throws(() => build(CSV.replace('5,"Bachelor\'s degree",51.0602,"Dental Hygiene/Hygienist",4', '3,"Associate\'s degree",51.0602,"Dental Hygiene/Hygienist",4')), /twice/);
  assert.equal(parseAwards('0', 'x'), 0);
  assert.equal(parseAwards('1,204', 'x'), 1204);
});
