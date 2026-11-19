/**
 * Shapes of the job outlook files in src/data/outlook/.
 * The import script writes these files; the site reads them.
 *
 * These projections come from a different source from the pay survey and
 * count jobs differently, for different years. Never add, subtract or
 * compare them with the pay survey's job counts.
 */

/** One figure: a number, or null when the source does not publish it. */
export type OutlookValue = number | null;

export interface OutlookFigures {
  /** Jobs in the base year, for example 2024. */
  baseJobs: OutlookValue;
  /** Projected jobs in the projected year, for example 2034. */
  projectedJobs: OutlookValue;
  /** Percent change over the period, as published by the source. */
  percentChange: OutlookValue;
  /** Average openings a year over the period. */
  openings: OutlookValue;
}

export interface OutlookPlace {
  /** FIPS code, for example "48" for Texas. */
  code: string;
  name: string;
  figures: OutlookFigures;
}

export interface OutlookData {
  occupation: { code: string; title: string };
  source: {
    /** The source name to show on the site. */
    name: string;
    baseYear: number;
    projectedYear: number;
    fileRead: string;
    /** Date the import was run, as YYYY-MM-DD. */
    importedOn: string;
  };
  national: OutlookFigures;
  /** Every state, DC and territory in the file. */
  places: OutlookPlace[];
  /** States, DC and territories in the pay data that the file does not include. */
  notInFile: string[];
}
