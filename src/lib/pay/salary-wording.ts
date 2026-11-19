/**
 * Titles and opening sentences for salary pages, worked out from the
 * official figures so that each page answers "what is the salary?" first.
 */
import { formatAnnual, formatHourly, numeric } from './format.ts';
import type { PayFigures } from './types.ts';

/** "$99,240 a year, $47.71 an hour", or whichever half is published. Undefined if neither is. */
export function salaryFigures(figures: PayFigures | undefined, joiner = ', '): string | undefined {
  const year = numeric(figures?.annual.median);
  const hour = numeric(figures?.hourly.median);
  const parts = [
    ...(year !== undefined ? [`${formatAnnual(year)} a year`] : []),
    ...(hour !== undefined ? [`${formatHourly(hour)} an hour`] : []),
  ];
  return parts.length ? parts.join(joiner) : undefined;
}

/**
 * Page title, for example "Dental hygienist salary in Texas: $99,240 a year,
 * $47.71 an hour". Without figures: "Dental hygienist salary in Texas".
 */
export function salaryTitle(name: string, place: string, figures: PayFigures | undefined): string {
  const amounts = salaryFigures(figures);
  return amounts ? `${name} salary in ${place}: ${amounts}` : `${name} salary in ${place}`;
}

/**
 * The first sentence of a salary page, for example "The median salary for
 * dental hygienists in Texas is $99,240 a year, or $47.71 an hour (US Bureau
 * of Labor Statistics, Occupational Employment and Wage Statistics, May 2025)."
 * Undefined when the survey publishes no median for the place.
 */
export function salaryLead(plural: string, place: string, figures: PayFigures | undefined, source: string): string | undefined {
  const amounts = salaryFigures(figures, ', or ');
  return amounts ? `The median salary for ${plural} in ${place} is ${amounts} (${source}).` : undefined;
}
