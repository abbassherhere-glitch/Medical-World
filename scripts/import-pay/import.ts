/**
 * Imports official pay figures for each profession in config.ts.
 *
 *   npm run import-pay
 *
 * Reads the files in data/source/ and writes one file per profession to
 * src/data/pay/, for example src/data/pay/dental-hygienist.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PayData } from '../../src/lib/pay/types.ts';
import { OUTPUT_DIR, PROFESSIONS, SOURCE_DIR } from './config.ts';
import { buildAreas, buildStates, figuresFromRow, findOccupation, symbolsUsed } from './extract.ts';
import { readSources } from './sources.ts';
import { SYMBOL_MEANINGS, TOP_PAY_LEVEL } from '../../src/lib/pay/symbols.ts';
import { formatPayData } from './format.ts';
import { importOutlook } from './import-outlook.ts';

const codes = new Set<string>(PROFESSIONS.map((p) => p.occCode));
const sources = await readSources(SOURCE_DIR, codes);
const yy = String(sources.year).slice(2);
const today = new Date().toISOString().slice(0, 10);

mkdirSync(OUTPUT_DIR, { recursive: true });

if (TOP_PAY_LEVEL.release !== `May ${sources.year}`) {
  console.warn(
    `Note: the top pay limits in src/lib/pay/symbols.ts are for ${TOP_PAY_LEVEL.release}, ` +
      `but this is the May ${sources.year} release. Check the release's official notes and update them.`,
  );
}

for (const profession of PROFESSIONS) {
  const { row, title } = findOccupation(sources.national, profession.occCode, profession.expectedTitle);
  const states = buildStates(sources.state, profession.occCode);
  const areas = buildAreas(sources.metro, sources.nonmetro, profession.occCode);
  const national = figuresFromRow(row);

  const allFigures = [national, ...states.flatMap((s) => (s.figures ? [s.figures] : [])), ...areas.map((a) => a.figures)];
  const symbols = Object.fromEntries(symbolsUsed(allFigures).map((s) => [s, SYMBOL_MEANINGS[s]]));

  const data: PayData = {
    occupation: { code: profession.occCode, title },
    release: {
      publisher: 'US Bureau of Labor Statistics',
      survey: 'Occupational Employment and Wage Statistics',
      referencePeriod: `May ${sources.year}`,
      officialFiles: [`oesm${yy}nat.zip`, `oesm${yy}st.zip`, `oesm${yy}ma.zip`],
      filesRead: sources.filesRead,
      sourceNote:
        sources.layout === 'zip'
          ? 'Read directly from the official files.'
          : 'Read from row extracts of the official files: rows copied unchanged, with every original column and the original header row.',
      importedOn: today,
    },
    symbols,
    national,
    states,
    areas,
  };

  const file = join(OUTPUT_DIR, `${profession.slug}.json`);
  writeFileSync(file, formatPayData(data));

  const unpublished = states.filter((s) => !s.published).map((s) => s.name);
  console.log(`${title} (${profession.occCode}) -> ${file}`);
  console.log(`  Release: ${data.release.survey}, ${data.release.referencePeriod} (${sources.layout} files)`);
  console.log(`  National median: ${JSON.stringify(national.annual.median)} a year, ${JSON.stringify(national.hourly.median)} an hour`);
  console.log(`  States and territories with figures: ${states.length - unpublished.length}; without: ${unpublished.join(', ') || 'none'}`);
  console.log(`  Metropolitan and nonmetropolitan areas: ${areas.length}`);
  console.log(`  Symbols found: ${Object.keys(symbols).join(' ') || 'none'}`);
}

// Then the job outlook, if the projections file is in data/source/.
importOutlook();
