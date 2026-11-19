/**
 * Applies the owner's overrides from src/data/pay/overrides.json.
 * An override replaces one figure for one place. A mistake in the file
 * (an unknown profession, place or figure) stops the build with a message,
 * so an override is never silently ignored.
 */
import type { PayData, PayFigures, PaySymbol, PayValue } from './types.ts';

export interface Override {
  /** Profession, as in the data file name, for example "dental-hygienist". */
  profession: string;
  /** "United States", a state name such as "Texas", or an area name exactly as on the site. */
  place: string;
  /** Which figure, for example "annual.median" or "jobs". */
  figure: string;
  /** The new figure: a number, or "Not available". */
  value: number | string;
  /** Optional note on why the figure was changed. Not shown on the site. */
  note?: string;
}

const PERCENTILES = ['mean', 'p10', 'p25', 'median', 'p75', 'p90'] as const;
export const OVERRIDABLE_FIGURES = [
  'jobs',
  ...PERCENTILES.map((p) => `hourly.${p}`),
  ...PERCENTILES.map((p) => `annual.${p}`),
];

function toValue(override: Override): PayValue {
  if (typeof override.value === 'number' && Number.isFinite(override.value) && override.value >= 0) {
    return override.value;
  }
  if (typeof override.value === 'string' && override.value.trim().toLowerCase() === 'not available') {
    return { symbol: (override.figure === 'jobs' ? '**' : '*') as PaySymbol };
  }
  throw new Error(
    `Override for ${override.place} (${override.figure}): the value must be a number or "Not available", not ${JSON.stringify(override.value)}.`,
  );
}

function setFigure(figures: PayFigures, figure: string, value: PayValue) {
  if (figure === 'jobs') {
    figures.employment = value;
    return;
  }
  const [kind, key] = figure.split('.') as ['hourly' | 'annual', (typeof PERCENTILES)[number]];
  figures[kind][key] = value;
}

/** Returns a copy of `data` with the overrides for `profession` applied. */
export function applyOverrides(data: PayData, profession: string, overrides: Override[], knownProfessions: string[]): PayData {
  const result: PayData = structuredClone(data);

  for (const override of overrides) {
    if (!knownProfessions.includes(override.profession)) {
      throw new Error(`Override names an unknown profession "${override.profession}". Known: ${knownProfessions.join(', ')}.`);
    }
    if (!OVERRIDABLE_FIGURES.includes(override.figure)) {
      throw new Error(`Override for ${override.place} names an unknown figure "${override.figure}". Use one of: ${OVERRIDABLE_FIGURES.join(', ')}.`);
    }
    if (override.profession !== profession) continue;

    const value = toValue(override);
    const place = override.place.trim();
    if (place === 'United States') {
      setFigure(result.national, override.figure, value);
      continue;
    }
    const state = result.states.find((s) => s.name === place);
    if (state) {
      if (!state.figures) {
        throw new Error(`Override for ${place}: the release has no figures for this state, so a single figure cannot be replaced.`);
      }
      setFigure(state.figures, override.figure, value);
      continue;
    }
    const area = result.areas.find((a) => a.name === place);
    if (area) {
      setFigure(area.figures, override.figure, value);
      continue;
    }
    throw new Error(`Override names an unknown place "${place}". Use "United States", a state name or an area name exactly as in the data file.`);
  }
  return result;
}
