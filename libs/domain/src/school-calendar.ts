/**
 * Schulkalender-Hilfen für das österreichische Schuljahr (1. September – 31. August).
 *
 * Reine Funktionen ohne Abhängigkeiten, gemeinsam genutzt von Frontend und Backend.
 * Gerechnet wird in lokaler Zeit mit Kalendertagen (ohne Uhrzeit).
 */

export type Semester = 1 | 2;

export interface DateRange {
  /** Erster Tag (00:00 Uhr) */
  from: Date;
  /** Letzter Tag (00:00 Uhr) – inklusive */
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Schuljahr eines Datums, z. B. 15.10.2026 → '2026/27', 20.01.2027 → '2026/27' */
export function schoolYearOf(date: Date): string {
  const start = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}

/** Startjahr eines Schuljahres, z. B. '2026/27' → 2026 */
export function schoolYearStart(schoolYear: string): number {
  const year = parseInt(schoolYear.split('/')[0], 10);
  if (Number.isNaN(year)) throw new Error(`Ungültiges Schuljahr: "${schoolYear}"`);
  return year;
}

/** 1. September bis 31. August */
export function schoolYearBounds(schoolYear: string): DateRange {
  const y = schoolYearStart(schoolYear);
  return { from: new Date(y, 8, 1), to: new Date(y + 1, 7, 31) };
}

/** 1. Semester: September – Jänner, 2. Semester: Februar – August */
export function semesterOf(date: Date): Semester {
  const month = date.getMonth() + 1;
  return month >= 9 || month <= 1 ? 1 : 2;
}

/**
 * Zeitraum eines Semesters.
 * 1. Semester: 01.09. – 31.01., 2. Semester: 01.02. – 31.08.
 */
export function semesterBounds(schoolYear: string, semester: Semester): DateRange {
  const y = schoolYearStart(schoolYear);
  return semester === 1
    ? { from: new Date(y, 8, 1), to: new Date(y + 1, 0, 31) }
    : { from: new Date(y + 1, 1, 1), to: new Date(y + 1, 7, 31) };
}

/** Datum als 'YYYY-MM-DD' (lokale Zeit, wie in Datums-Spalten gespeichert) */
export function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Montag (00:00 Uhr) der Woche, in der `date` liegt */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sonntag
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

/**
 * Laufende Schulwoche: 0 = Woche, in der der 1. September des Schuljahres liegt.
 *
 * Gezählt werden echte Wochen ab diesem Montag, nicht ISO-Kalenderwochen.
 * Dadurch gibt es keinen Sprung in Jahren mit 53 Kalenderwochen (z. B. 2026).
 */
export function schoolWeekIndex(date: Date): number {
  const monday = mondayOf(date);
  const anchor = mondayOf(new Date(schoolYearStart(schoolYearOf(date)), 8, 1));
  // runden gleicht die Zeitumstellung (23/25-Stunden-Tage) aus
  return Math.round((monday.getTime() - anchor.getTime()) / (7 * DAY_MS));
}

/**
 * Woche A oder B im zweiwöchigen Rhythmus.
 * Die Woche mit dem 1. September ist Woche A, danach wird streng abgewechselt.
 */
export function isWeekA(date: Date): boolean {
  return schoolWeekIndex(date) % 2 === 0;
}
