/**
 * Shapes of the schools files in src/data/schools/. The import script writes
 * them; the site reads them. Only what the official file says is kept: no
 * accreditation, cost, length or admission information, which the file does
 * not contain.
 */

export type Control = 'Public' | 'Private nonprofit' | 'Private for-profit';

export interface AwardLevel {
  /** The file's award level code, for example 3 for an associate's degree. */
  code: number;
  /** The file's wording, for example "Associate's degree". */
  name: string;
  /** Number of awards the college reported for the year. Can be 0. */
  awards: number;
}

export interface School {
  /** The college's IPEDS unit ID. */
  id: string;
  name: string;
  city: string;
  /** Postal abbreviation, for example "TX". */
  state: string;
  /** FIPS code, for example "48". */
  stateCode: string;
  /** Web address exactly as in the file (it may have no "https://"). */
  website: string;
  control: Control;
  levels: AwardLevel[];
}

export interface SchoolsData {
  program: { cip: string; title: string };
  source: {
    name: string;
    awardYear: string;
    fileRead: string;
    /** Date the import was run, as YYYY-MM-DD. */
    importedOn: string;
  };
  schools: School[];
}
