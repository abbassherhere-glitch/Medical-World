/**
 * Shape of the licensing data in src/data/licensing/. This file is collected
 * by hand from official board pages. A null value or an empty list means the
 * fact has not been confirmed yet.
 */

export interface LicensingEntry {
  state: string;
  board: { name: string; url: string };
  /** Date the facts were read, as YYYY-MM-DD. */
  checked: string;
  reviewed_by_qualified_person: boolean;
  sources: string[];
  first_license: {
    education: string | null;
    national_exam: string | null;
    clinical_exam: string | null;
    law_exam: string | null;
    other_requirements: string[];
    fee: string | null;
  };
  renewal: { period: string | null; fee: string | null };
  continuing_education: { hours: string | null; required_topics: string[]; first_renewal: string | null };
  notes: string[];
}

export interface LicensingData {
  about: string;
  profession: string;
  states: LicensingEntry[];
}
