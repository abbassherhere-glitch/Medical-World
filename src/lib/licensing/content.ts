/**
 * Turns one state's licensing entry into what the page shows. Every fact is
 * the file's own text, unchanged: labels and headings are added around it,
 * never inside it. A null value or an empty list is shown as NOT_CONFIRMED.
 */
import type { LicensingEntry } from './types.ts';

export const NOT_CONFIRMED = 'Not confirmed yet. Check with the board.';

/** One line in a step: an optional label, then either one fact or a list of facts. */
export interface StepLine {
  label?: string;
  /** The file's text, or null when not confirmed. */
  text?: string | null;
  /** The file's list, shown as a list; empty when not confirmed. */
  list?: string[];
}

export interface Step {
  title: string;
  lines: StepLine[];
}

/** The five steps, in the same layout as the placeholder steps they replace. */
export function licensingSteps(entry: LicensingEntry): Step[] {
  const f = entry.first_license;
  const r = entry.renewal;
  const ce = entry.continuing_education;
  return [
    { title: 'Education.', lines: [{ text: f.education }] },
    { title: 'National board exam.', lines: [{ text: f.national_exam }] },
    { title: 'Clinical exam.', lines: [{ text: f.clinical_exam }] },
    {
      title: 'Application and fees.',
      lines: [
        { label: 'Law or jurisprudence exam', text: f.law_exam },
        { label: 'Other requirements', list: f.other_requirements },
        { label: 'Fee', text: f.fee },
      ],
    },
    {
      title: 'Renewal.',
      lines: [
        { label: 'How often', text: r.period },
        { label: 'Renewal fee', text: r.fee },
        { label: 'Continuing education', text: ce.hours },
        { label: 'Required topics', list: ce.required_topics },
        { label: 'First renewal', text: ce.first_renewal },
      ],
    },
  ];
}

/** "2026-11-20" as "November 20, 2026". */
export function formatChecked(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Every value in an entry that is null or an empty list (notes are optional and left out). */
export function missingValues(entry: LicensingEntry): string[] {
  const checks: [string, unknown][] = [
    ['First license: education', entry.first_license.education],
    ['First license: national exam', entry.first_license.national_exam],
    ['First license: clinical exam', entry.first_license.clinical_exam],
    ['First license: law exam', entry.first_license.law_exam],
    ['First license: other requirements', entry.first_license.other_requirements],
    ['First license: fee', entry.first_license.fee],
    ['Renewal: period', entry.renewal.period],
    ['Renewal: fee', entry.renewal.fee],
    ['Continuing education: hours', entry.continuing_education.hours],
    ['Continuing education: required topics', entry.continuing_education.required_topics],
    ['Continuing education: first renewal', entry.continuing_education.first_renewal],
  ];
  return checks.filter(([, v]) => v === null || (Array.isArray(v) && v.length === 0)).map(([label]) => label);
}

/**
 * Key takeaways with licensing facts. Each is a fixed label, then the file's
 * text unchanged, so a check can confirm the fact is in the file.
 */
export const TAKEAWAY_LABELS = {
  fee: (where: string) => `Fee for a first dental hygienist license in ${where}: `,
  renewal: (where: string) => `License renewal in ${where}: `,
};

export function licensingTakeaways(entry: LicensingEntry, where: string): string[] {
  return [
    ...(entry.first_license.fee ? [TAKEAWAY_LABELS.fee(where) + entry.first_license.fee] : []),
    ...(entry.renewal.period ? [TAKEAWAY_LABELS.renewal(where) + entry.renewal.period] : []),
  ];
}

/**
 * Common questions about licensing. Each answer is exactly one value from the
 * file. A question the file cannot answer is left out.
 */
export function licensingQuestions(entry: LicensingEntry, where: string): { question: string; answer: string }[] {
  const qs: [string, string | null][] = [
    [`How much does a first dental hygienist license cost in ${where}?`, entry.first_license.fee],
    [`Which clinical exams are accepted for a dental hygienist license in ${where}?`, entry.first_license.clinical_exam],
    [`How often is a dental hygienist license renewed in ${where}?`, entry.renewal.period],
    [`How much continuing education do dental hygienists need in ${where}?`, entry.continuing_education.hours],
  ];
  return qs.filter((q): q is [string, string] => typeof q[1] === 'string').map(([question, answer]) => ({ question, answer }));
}

/** Every text value in an entry, for the check that each shown fact is in the file. */
export function factsIn(entry: LicensingEntry): string[] {
  const f = entry.first_license;
  const ce = entry.continuing_education;
  return [
    f.education,
    f.national_exam,
    f.clinical_exam,
    f.law_exam,
    ...f.other_requirements,
    f.fee,
    entry.renewal.period,
    entry.renewal.fee,
    ce.hours,
    ...ce.required_topics,
    ce.first_renewal,
    ...entry.notes,
    entry.board.name,
  ].filter((v): v is string => typeof v === 'string');
}
