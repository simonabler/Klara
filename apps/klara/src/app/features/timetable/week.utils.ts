import { TimetableEntryDto } from '@app/domain';
import { RepeatType, WeekVariant } from '@app/domain';

export interface WeekInfo {
  mondayDate: Date;
  isoWeek:    number;
  isWeekA:    boolean;
  semester:   1 | 2;
  label:      string;
}

/** Gibt den Montag der Woche zurück, in der `date` liegt */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = So
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO-Kalenderwoche (1–53) */
export function getISOWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Schuljahr als String, z.B. '2025/26' */
export function currentSchoolYear(): string {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const start = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}

/**
 * Woche A oder B:
 * KW 36 (erster möglicher Schulstart AT) gilt als Referenz-KW-A.
 * Jede ungerade Differenz zur Referenz → Woche B.
 */
export function isWeekA(isoWeek: number): boolean {
  const referenceWeekA = 36;
  return ((isoWeek - referenceWeekA) % 2 + 2) % 2 === 0;
}

/** Aktuelles Semester (1 = Sep–Jan, 2 = Feb–Jun) */
export function getSemester(date: Date): 1 | 2 {
  const m = date.getMonth() + 1;
  return m >= 9 || m <= 1 ? 1 : 2;
}

/** Vollständige WeekInfo für eine gegebene Montags-Datum */
export function buildWeekInfo(monday: Date): WeekInfo {
  const kw = getISOWeek(monday);
  return {
    mondayDate: monday,
    isoWeek:    kw,
    isWeekA:    isWeekA(kw),
    semester:   getSemester(monday),
    label:      formatWeekLabel(monday),
  };
}

/** Lesbares Wochen-Label, z.B. "24. – 28. März 2026 · KW 13" */
export function formatWeekLabel(monday: Date): string {
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const kw   = getISOWeek(monday);
  const dFmt = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long' });
  const full = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long', year: 'numeric' });
  const from = monday.getMonth() === friday.getMonth()
    ? `${monday.getDate()}.`
    : dFmt.format(monday);
  return `${from} – ${full.format(friday)} · KW ${kw}`;
}

/** Datum von Tag X (1=Mo…5=Fr) in einer Woche ab mondayDate */
export function dateOfDay(monday: Date, dayOfWeek: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d;
}

/** Prüft ob ein Datum heute ist */
export function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();
}

/**
 * Filtert Stundenplan-Einträge für eine konkrete Woche.
 * Berücksichtigt: repeatType, weekVariant, semester, onceDate, validFrom, validTo.
 */
export function filterEntriesForWeek(
  entries: TimetableEntryDto[],
  week: WeekInfo,
): TimetableEntryDto[] {
  const friday = new Date(week.mondayDate);
  friday.setDate(friday.getDate() + 4);

  return entries.filter(e => {
    // Gültigkeitszeitraum
    if (e.validFrom && new Date(e.validFrom) > friday)      return false;
    if (e.validTo   && new Date(e.validTo)   < week.mondayDate) return false;

    switch (e.repeatType) {
      case RepeatType.WEEKLY:
        return true;

      case RepeatType.BIWEEKLY: {
        if (!e.weekVariant || e.weekVariant === WeekVariant.BOTH) return true;
        return e.weekVariant === WeekVariant.A ? week.isWeekA : !week.isWeekA;
      }

      case RepeatType.SEMESTER:
        return e.semester === week.semester;

      case RepeatType.ONCE: {
        if (!e.onceDate) return false;
        const onceMonday = getMondayOfWeek(new Date(e.onceDate));
        return onceMonday.getTime() === week.mondayDate.getTime();
      }

      default:
        return false;
    }
  });
}

/** Gibt ein lesbares Repeat-Label zurück */
export function repeatLabel(repeatType: RepeatType, weekVariant?: WeekVariant | null, semester?: number | null): string {
  switch (repeatType) {
    case RepeatType.WEEKLY:   return 'wöchentl.';
    case RepeatType.BIWEEKLY:
      if (weekVariant === WeekVariant.A)    return 'Woche A';
      if (weekVariant === WeekVariant.B)    return 'Woche B';
      return '2-wöchentl.';
    case RepeatType.SEMESTER: return semester === 1 ? '1. Sem.' : '2. Sem.';
    case RepeatType.ONCE:     return 'einmalig';
    default:                  return '';
  }
}

/** Hellt eine Hex-Farbe auf für Hintergrundnutzung (Opazität ~12%) */
export function hexToFaint(hex: string | null): string {
  if (!hex) return '#EEF4F7';
  // Strip # and parse
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.13)`;
}

/** Stundenzeiten für AT-Schulen (Stunde 1–10) */
export const PERIOD_TIMES: Record<number, string> = {
  1:  '7:55',
  2:  '8:45',
  3:  '9:40',
  4:  '10:30',
  5:  '11:20',
  6:  '12:10',
  7:  '13:05',
  8:  '13:55',
  9:  '14:45',
  10: '15:35',
};

export const DAY_NAMES: Record<number, string> = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
};

export const DAY_NAMES_LONG: Record<number, string> = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
};
