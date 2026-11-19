/**
 * Applies the owner's overrides from src/data/outlook/overrides.json, in the
 * same way as the pay overrides. A mistake stops the build with a message.
 */
import type { OutlookData, OutlookFigures } from './types.ts';

export interface OutlookOverride {
  profession: string;
  /** "United States" or a state name, for example "Texas". */
  place: string;
  /** "baseJobs", "projectedJobs", "percentChange" or "openings". */
  figure: string;
  /** A number, or "Not available". */
  value: number | string;
  note?: string;
}

export const OUTLOOK_FIGURES: (keyof OutlookFigures)[] = ['baseJobs', 'projectedJobs', 'percentChange', 'openings'];

export function applyOutlookOverrides(
  data: OutlookData,
  profession: string,
  overrides: OutlookOverride[],
  knownProfessions: string[],
): OutlookData {
  const result: OutlookData = structuredClone(data);
  for (const o of overrides) {
    if (!knownProfessions.includes(o.profession)) {
      throw new Error(`Outlook override names an unknown profession "${o.profession}". Known: ${knownProfessions.join(', ')}.`);
    }
    if (!OUTLOOK_FIGURES.includes(o.figure as keyof OutlookFigures)) {
      throw new Error(`Outlook override for ${o.place} names an unknown figure "${o.figure}". Use one of: ${OUTLOOK_FIGURES.join(', ')}.`);
    }
    if (o.profession !== profession) continue;
    let value: number | null;
    if (typeof o.value === 'number' && Number.isFinite(o.value)) value = o.value;
    else if (typeof o.value === 'string' && o.value.trim().toLowerCase() === 'not available') value = null;
    else throw new Error(`Outlook override for ${o.place} (${o.figure}): the value must be a number or "Not available".`);

    const place = o.place.trim();
    const target = place === 'United States' ? result.national : result.places.find((p) => p.name === place)?.figures;
    if (!target) throw new Error(`Outlook override names an unknown place "${place}". Use "United States" or a state name.`);
    target[o.figure as keyof OutlookFigures] = value;
  }
  return result;
}
