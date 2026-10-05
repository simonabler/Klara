import { RepeatType, TimetableEntryDto, WeekVariant } from '@app/domain';
import {
  buildWeekInfo,
  filterEntriesForWeek,
  getISOWeek,
  getMondayOfWeek,
  getSemester,
  hexToFaint,
  isWeekA,
  repeatLabel,
  schoolYearBounds,
} from './week.utils';

/** Minimaler Stundenplan-Eintrag für Filtertests */
function entry(overrides: Partial<TimetableEntryDto>): TimetableEntryDto {
  return {
    id: 'e1',
    dayOfWeek: 1,
    period: 1,
    repeatType: RepeatType.WEEKLY,
    schoolYear: '2026/27',
    ...overrides,
  } as TimetableEntryDto;
}

describe('week.utils', () => {
  describe('getMondayOfWeek', () => {
    it('liefert für einen Mittwoch den Montag derselben Woche', () => {
      const monday = getMondayOfWeek(new Date(2026, 9, 7)); // Mi 07.10.2026
      expect(monday).toEqual(new Date(2026, 9, 5));
    });

    it('ordnet einen Sonntag der vorangehenden Woche zu', () => {
      const monday = getMondayOfWeek(new Date(2026, 9, 11)); // So 11.10.2026
      expect(monday).toEqual(new Date(2026, 9, 5));
    });
  });

  describe('getISOWeek', () => {
    it('berechnet die ISO-Kalenderwoche', () => {
      expect(getISOWeek(new Date(2026, 9, 5))).toBe(41);
    });

    it('ordnet den 01.01.2027 (Freitag) der KW 53 von 2026 zu', () => {
      expect(getISOWeek(new Date(2027, 0, 1))).toBe(53);
    });
  });

  describe('isWeekA', () => {
    it('KW 36 ist Referenz-Woche A, KW 37 ist Woche B', () => {
      expect(isWeekA(36)).toBe(true);
      expect(isWeekA(37)).toBe(false);
      expect(isWeekA(38)).toBe(true);
    });

    it('funktioniert auch für Wochen vor der Referenz', () => {
      expect(isWeekA(35)).toBe(false);
      expect(isWeekA(2)).toBe(true);
    });
  });

  describe('getSemester', () => {
    it('September bis Jänner ist das 1. Semester', () => {
      expect(getSemester(new Date(2026, 8, 15))).toBe(1);
      expect(getSemester(new Date(2027, 0, 20))).toBe(1);
    });

    it('Februar bis August ist das 2. Semester', () => {
      expect(getSemester(new Date(2027, 1, 1))).toBe(2);
      expect(getSemester(new Date(2027, 5, 30))).toBe(2);
    });
  });

  describe('schoolYearBounds', () => {
    it('läuft vom 01.09. bis 31.08. des Folgejahres', () => {
      const { from, to } = schoolYearBounds('2026/27');
      expect(from).toEqual(new Date(2026, 8, 1));
      expect(to).toEqual(new Date(2027, 7, 31));
    });
  });

  describe('filterEntriesForWeek', () => {
    const weekA = buildWeekInfo(new Date(2026, 8, 28)); // KW 40 → Woche A, 1. Semester
    const weekB = buildWeekInfo(new Date(2026, 9, 5));  // KW 41 → Woche B

    it('Voraussetzung: Testwochen sind A bzw. B', () => {
      expect(weekA.isWeekA).toBe(true);
      expect(weekB.isWeekA).toBe(false);
    });

    it('zeigt wöchentliche Einträge immer an', () => {
      const e = entry({ repeatType: RepeatType.WEEKLY });
      expect(filterEntriesForWeek([e], weekA)).toHaveLength(1);
      expect(filterEntriesForWeek([e], weekB)).toHaveLength(1);
    });

    it('zeigt A-Wochen-Einträge nur in Woche A an', () => {
      const e = entry({ repeatType: RepeatType.BIWEEKLY, weekVariant: WeekVariant.A });
      expect(filterEntriesForWeek([e], weekA)).toHaveLength(1);
      expect(filterEntriesForWeek([e], weekB)).toHaveLength(0);
    });

    it('zeigt B-Wochen-Einträge nur in Woche B an', () => {
      const e = entry({ repeatType: RepeatType.BIWEEKLY, weekVariant: WeekVariant.B });
      expect(filterEntriesForWeek([e], weekA)).toHaveLength(0);
      expect(filterEntriesForWeek([e], weekB)).toHaveLength(1);
    });

    it('zeigt Semester-Einträge nur im passenden Semester an', () => {
      const sem1 = entry({ repeatType: RepeatType.SEMESTER, semester: 1 });
      const sem2 = entry({ repeatType: RepeatType.SEMESTER, semester: 2 });
      expect(filterEntriesForWeek([sem1, sem2], weekA)).toEqual([sem1]);
    });

    it('zeigt Einzeltermine nur in ihrer Woche an', () => {
      const e = entry({ repeatType: RepeatType.ONCE, onceDate: '2026-10-07' });
      expect(filterEntriesForWeek([e], weekA)).toHaveLength(0);
      expect(filterEntriesForWeek([e], weekB)).toHaveLength(1);
    });

    it('blendet Einträge außerhalb von validFrom/validTo aus', () => {
      const e = entry({ validFrom: '2026-10-01' });
      expect(filterEntriesForWeek([e], weekA)).toHaveLength(1); // Woche reicht bis 02.10.
      const later = entry({ validFrom: '2026-10-05' });
      expect(filterEntriesForWeek([later], weekA)).toHaveLength(0);
    });

    it('blendet Einträge eines anderen Schuljahres aus', () => {
      const e = entry({ schoolYear: '2025/26' });
      expect(filterEntriesForWeek([e], weekA)).toHaveLength(0);
    });
  });

  describe('repeatLabel', () => {
    it('liefert lesbare Kurzlabels', () => {
      expect(repeatLabel(RepeatType.WEEKLY)).toBe('wöchentl.');
      expect(repeatLabel(RepeatType.BIWEEKLY, WeekVariant.A)).toBe('Woche A');
      expect(repeatLabel(RepeatType.BIWEEKLY, WeekVariant.BOTH)).toBe('2-wöchentl.');
      expect(repeatLabel(RepeatType.SEMESTER, null, 2)).toBe('2. Sem.');
      expect(repeatLabel(RepeatType.ONCE)).toBe('einmalig');
    });
  });

  describe('hexToFaint', () => {
    it('wandelt Hex in eine transparente rgba-Farbe um', () => {
      expect(hexToFaint('#FF8000')).toBe('rgba(255, 128, 0, 0.13)');
    });

    it('liefert einen Standardwert ohne Farbe', () => {
      expect(hexToFaint(null)).toBe('#EEF4F7');
    });
  });
});
