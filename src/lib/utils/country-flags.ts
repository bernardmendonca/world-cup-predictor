/**
 * Maps FIFA 3-letter country codes to ISO 3166-1 alpha-2 codes.
 * Used for resolving flag SVG file paths from team codes stored in the database.
 *
 * Flag SVGs are stored in /public/flags/{iso}.svg (lowercase ISO alpha-2 code).
 */

const FIFA_TO_ISO: Record<string, string> = {
  // Group A
  MEX: "mx",
  RSA: "za",
  KOR: "kr",
  CZE: "cz",
  // Group B
  CAN: "ca",
  BIH: "ba",
  QAT: "qa",
  SUI: "ch",
  // Group C
  BRA: "br",
  MAR: "ma",
  HAI: "ht",
  SCO: "gb-sct",
  // Group D
  USA: "us",
  PAR: "py",
  AUS: "au",
  TUR: "tr",
  // Group E
  GER: "de",
  CUW: "cw",
  CIV: "ci",
  ECU: "ec",
  // Group F
  NED: "nl",
  JPN: "jp",
  SWE: "se",
  TUN: "tn",
  // Group G
  BEL: "be",
  EGY: "eg",
  IRN: "ir",
  NZL: "nz",
  // Group H
  ESP: "es",
  CPV: "cv",
  KSA: "sa",
  URU: "uy",
  // Group I
  FRA: "fr",
  SEN: "sn",
  IRQ: "iq",
  NOR: "no",
  // Group J
  ARG: "ar",
  ALG: "dz",
  AUT: "at",
  JOR: "jo",
  // Group K
  POR: "pt",
  COD: "cd",
  UZB: "uz",
  COL: "co",
  // Group L
  ENG: "gb-eng",
  CRO: "hr",
  GHA: "gh",
  PAN: "pa",
};

/**
 * Returns the ISO alpha-2 code for a given FIFA code.
 * Returns null if the FIFA code is not recognized.
 */
export function fifaToIso(fifaCode: string): string | null {
  return FIFA_TO_ISO[fifaCode.toUpperCase()] ?? null;
}

/**
 * Returns the path to the flag SVG for a given FIFA team code.
 * Returns null if the code is not recognized.
 *
 * Usage in Next.js: <Image src={getFlagPath("BRA")} ... />
 * Or in an img tag: <img src={getFlagPath("BRA")} ... />
 */
export function getFlagPath(fifaCode: string): string | null {
  const iso = fifaToIso(fifaCode);
  if (!iso) return null;
  return `/flags/${iso}.svg`;
}

/**
 * Returns all FIFA codes and their corresponding ISO codes.
 * Useful for batch operations like downloading flag assets.
 */
export function getAllFifaToIsoMappings(): Array<{ fifa: string; iso: string }> {
  return Object.entries(FIFA_TO_ISO).map(([fifa, iso]) => ({ fifa, iso }));
}
