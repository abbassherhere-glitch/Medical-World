/**
 * Tests for the pay import. Run with: npm test
 * The rows below are small made-up samples in the official layout; they are
 * test data only and never appear on the site.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateRawSync } from 'node:zlib';
import { parseCsv, toRecords } from './csv.ts';
import { buildAreas, buildStates, figuresFromRow, findOccupation, statesOfArea, symbolsUsed } from './extract.ts';
import { parseFlag, parseValue } from './parse.ts';
import { columnIndex, readSheet } from './xlsx.ts';

const HEADER =
  'AREA,AREA_TITLE,AREA_TYPE,PRIM_STATE,NAICS,NAICS_TITLE,I_GROUP,OWN_CODE,OCC_CODE,OCC_TITLE,O_GROUP,TOT_EMP,EMP_PRSE,JOBS_1000,LOC_QUOTIENT,PCT_TOTAL,PCT_RPT,H_MEAN,A_MEAN,MEAN_PRSE,H_PCT10,H_PCT25,H_MEDIAN,H_PCT75,H_PCT90,A_PCT10,A_PCT25,A_MEDIAN,A_PCT75,A_PCT90,ANNUAL,HOURLY';

const row = (area: string, title: string, type: string, st: string, code: string, occ: string, rest: string) =>
  `${area},${title},${type},${st},000000,Cross-industry,cross-industry,1235,${code},${occ},detailed,${rest}`;

const NATIONAL = [
  HEADER,
  row('99', 'U.S.', '1', 'US', '29-1291', 'Acupuncturists', '100,1,,,,,10,20800,1,8,9,10,11,12,16640,18720,20800,22880,24960,,'),
  row('99', 'U.S.', '1', 'US', '29-1292', 'Dental Hygienists', '"1,234",1.6,1.2E-2,,,,20.5,42640,1,15,17.25,20.499999999999996,23,26,31200,35880,42640,47840,54080,,'),
].join('\n');

const records = (text: string) => toRecords(parseCsv(text));

test('finds the right occupation by code and checks its title', () => {
  const { row: found, title } = findOccupation(records(NATIONAL), '29-1292', 'Dental Hygienists');
  assert.equal(title, 'Dental Hygienists');
  assert.equal(found.OCC_CODE, '29-1292');
});

test('stops when the code is missing or the title differs', () => {
  assert.throws(() => findOccupation(records(NATIONAL), '29-9999', 'Dental Hygienists'), /was not found/);
  assert.throws(() => findOccupation(records(NATIONAL), '29-1291', 'Dental Hygienists'), /is titled "Acupuncturists"/);
});

test('parses numbers with commas, decimals and scientific notation', () => {
  assert.equal(parseValue('1,234', 'TOT_EMP', 0), 1234);
  assert.equal(parseValue('1,234,567', 'TOT_EMP', 0), 1234567);
  assert.equal(parseValue('33.590000000000003', 'H_PCT10', 2), 33.59);
  assert.equal(parseValue('20.499999999999996', 'H_MEDIAN', 2), 20.5);
  assert.equal(parseValue('1.2E-2', 'JOBS_1000', 3), 0.012);
  assert.equal(parseValue(' 98100 ', 'A_MEDIAN', 0), 98100);

  const figures = figuresFromRow(findOccupation(records(NATIONAL), '29-1292', 'Dental Hygienists').row);
  assert.equal(figures.employment, 1234);
  assert.equal(figures.hourly.median, 20.5);
  assert.equal(figures.annual.median, 42640);
});

test('keeps special symbols as symbols, never as numbers', () => {
  assert.deepEqual(parseValue('*', 'H_MEDIAN', 2), { symbol: '*' });
  assert.deepEqual(parseValue('**', 'TOT_EMP', 0), { symbol: '**' });
  assert.deepEqual(parseValue('#', 'A_PCT90', 0), { symbol: '#' });
  assert.deepEqual(parseValue('~', 'PCT_RPT', 0), { symbol: '~' });
  assert.equal(parseFlag('TRUE', 'ANNUAL'), true);
  assert.equal(parseFlag('', 'ANNUAL'), false);
});

test('stops on a blank or unknown value instead of guessing', () => {
  assert.throws(() => parseValue('', 'A_MEDIAN', 0), /Unexpected value/);
  assert.throws(() => parseValue('n/a', 'A_MEDIAN', 0), /Unexpected value/);
  assert.throws(() => parseFlag('yes', 'ANNUAL'), /Unexpected value/);
});

test('reads symbols and flags in a full row', () => {
  const text = [
    HEADER,
    row('01', 'Alabama', '2', 'AL', '29-1292', 'Dental Hygienists', '**,**,**,**,,,*,50000,1,*,*,*,*,*,40000,45000,50000,#,#,TRUE,'),
  ].join('\n');
  const figures = figuresFromRow(records(text)[0]!);
  assert.deepEqual(figures.employment, { symbol: '**' });
  assert.deepEqual(figures.hourly.median, { symbol: '*' });
  assert.equal(figures.annual.median, 50000);
  assert.deepEqual(figures.annual.p90, { symbol: '#' });
  assert.equal(figures.annualOnly, true);
  assert.deepEqual(symbolsUsed([figures]), ['#', '*', '**']);
});

test('lists every state, marking those with no figures for the job', () => {
  const text = [
    HEADER,
    row('20', 'Kansas', '2', 'KS', '29-1291', 'Acupuncturists', '10,1,,,,,10,20800,1,8,9,10,11,12,16640,18720,20800,22880,24960,,'),
    row('48', 'Texas', '2', 'TX', '29-1292', 'Dental Hygienists', '100,1,,,,,20,41600,1,15,17,20,23,26,31200,35360,41600,47840,54080,,'),
    row('11', 'District of Columbia', '2', 'DC', '29-1292', 'Dental Hygienists', '50,1,,,,,20,41600,1,15,17,20,23,26,31200,35360,41600,47840,54080,,'),
    row('66', 'Guam', '3', 'GU', '29-1292', 'Dental Hygienists', '5,1,,,,,20,41600,1,15,17,20,23,26,31200,35360,41600,47840,54080,,'),
  ].join('\n');
  const states = buildStates(records(text), '29-1292');
  const byName = Object.fromEntries(states.map((s) => [s.name, s]));
  assert.equal(byName.Kansas!.published, false);
  assert.equal(byName.Kansas!.figures, undefined);
  assert.equal(byName.Texas!.published, true);
  assert.equal(byName['District of Columbia']!.kind, 'district');
  assert.equal(byName.Guam!.kind, 'territory');
});

test('tags each area with the states it lies in', () => {
  assert.deepEqual(statesOfArea('Texarkana, TX-AR', 'TX'), ['TX', 'AR']);
  assert.deepEqual(statesOfArea('Washington-Arlington-Alexandria, DC-VA-MD-WV', 'DC'), ['DC', 'VA', 'MD', 'WV']);
  assert.deepEqual(statesOfArea('Hill Country Region of Texas nonmetropolitan area', 'TX'), ['TX']);

  const metro = [HEADER, row('45500', '"Texarkana, TX-AR"', '4', 'TX', '29-1292', 'Dental Hygienists', '70,1,,,,,20,41600,1,15,17,20,23,26,31200,35360,41600,47840,54080,,')].join('\n');
  const [area] = buildAreas(records(metro), [], '29-1292');
  assert.equal(area!.name, 'Texarkana, TX-AR');
  assert.equal(area!.kind, 'metro');
  assert.deepEqual(area!.states, ['TX', 'AR']);
});

/* Builds a small zip file in memory, to test the spreadsheet reader. */
function makeZip(files: Record<string, string | Buffer>, deflate: boolean): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const packed = deflate ? deflateRawSync(data) : data;
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

test('reads rows from a spreadsheet, keeping only the rows asked for', async () => {
  const shared =
    '<sst><si><t>OCC_CODE</t></si><si><t>OCC_TITLE</t></si><si><t>A_MEDIAN</t></si>' +
    '<si><t>29-1292</t></si><si><r><t>Dental </t></r><r><t>Hygienists</t></r></si><si><t>29-1291</t></si></sst>';
  const sheet =
    '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>5</v></c><c r="B2" t="inlineStr"><is><t>Acupuncturists</t></is></c><c r="C2"><v>76040</v></c></row>' +
    '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3" t="s"><v>4</v></c><c r="D3" t="inlineStr"><is><t>#</t></is></c></row>' +
    '</sheetData></worksheet>';
  const xlsx = makeZip({ 'xl/sharedStrings.xml': shared, 'xl/worksheets/sheet1.xml': sheet }, true);

  const rows = await readSheet(xlsx, (cells) => cells.includes('29-1292'));
  assert.deepEqual(rows, [
    ['OCC_CODE', 'OCC_TITLE', 'A_MEDIAN'],
    ['29-1292', 'Dental Hygienists', '', '#'],
  ]);

  // The official zip files hold the spreadsheet inside another zip.
  const { findEntry, readEntry } = await import('./zip.ts');
  const outer = makeZip({ 'oesm25nat/national_M2025_dl.xlsx': xlsx }, false);
  const inner = readEntry(outer, findEntry(outer, /national_M\d{4}_dl\.xlsx$/)!);
  assert.equal((await readSheet(inner)).length, 3);
});

test('turns spreadsheet column letters into positions', () => {
  assert.equal(columnIndex('A1'), 0);
  assert.equal(columnIndex('Z9'), 25);
  assert.equal(columnIndex('AF12'), 31);
});
