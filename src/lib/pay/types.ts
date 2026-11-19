/**
 * Shapes of the pay data files in src/data/pay/.
 * The import script writes these files; the site reads them.
 */

/** Symbols the official files use in place of a number. */
export type PaySymbol = '*' | '**' | '#' | '~';

/**
 * One figure from the official files: either a number, or a record of the
 * symbol the file showed instead. A symbol is never turned into a number.
 */
export type PayValue = number | { symbol: PaySymbol };

export interface PayPercentiles {
  mean: PayValue;
  p10: PayValue;
  p25: PayValue;
  median: PayValue;
  p75: PayValue;
  p90: PayValue;
}

export interface PayFigures {
  /** Number of jobs (the survey's employment estimate). */
  employment: PayValue;
  hourly: PayPercentiles;
  annual: PayPercentiles;
  /** True when the survey publishes only annual wages for this job and area. */
  annualOnly?: boolean;
  /** True when the survey publishes only hourly wages for this job and area. */
  hourlyOnly?: boolean;
}

export type StateKind = 'state' | 'district' | 'territory';

export interface StatePay {
  /** Official area code, for example "48" for Texas. */
  code: string;
  name: string;
  /** Postal abbreviation, for example "TX". */
  abbr: string;
  kind: StateKind;
  /** False when the release has no figures for this job in this state. */
  published: boolean;
  figures?: PayFigures;
}

export type AreaKind = 'metro' | 'nonmetro';

export interface AreaPay {
  code: string;
  name: string;
  kind: AreaKind;
  /** Every state the area lies in, by postal abbreviation, for example ["TX", "AR"]. */
  states: string[];
  /** The state the official file lists first for this area. */
  primaryState: string;
  figures: PayFigures;
}

export interface PayRelease {
  publisher: string;
  /** For example "Occupational Employment and Wage Statistics". */
  survey: string;
  /** For example "May 2025". */
  referencePeriod: string;
  /** The official files the figures were taken from. */
  officialFiles: string[];
  /** The files actually read by the import, as found in data/source/. */
  filesRead: string[];
  /** How the files were obtained, for example "row extracts of the official files". */
  sourceNote: string;
  /** Date the import was run, as YYYY-MM-DD. */
  importedOn: string;
}

export interface PayData {
  occupation: { code: string; title: string };
  release: PayRelease;
  /** Meaning of each symbol that appears in this file's figures. */
  symbols: Partial<Record<PaySymbol, string>>;
  national: PayFigures;
  states: StatePay[];
  areas: AreaPay[];
}
