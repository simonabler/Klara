import {
  isWeekA,
  mondayOf,
  schoolWeekIndex,
  schoolYearBounds,
  schoolYearOf,
  semesterBounds,
  semesterOf,
  toIsoDate,
} from './school-calendar';

const d = (iso: string) => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
};

describe('school-calendar', () => {
  describe('schoolYearOf', () => {
    it('ordnet September–Dezember dem beginnenden Schuljahr zu', () => {
      expect(schoolYearOf(d('2026-09-01'))).toBe('2026/27');
      expect(schoolYearOf(d('2026-12-31'))).toBe('2026/27');
    });

    it('ordnet Jänner–August dem laufenden Schuljahr zu', () => {
      expect(schoolYearOf(d('2027-01-04'))).toBe('2026/27');
      expect(schoolYearOf(d('2027-08-31'))).toBe('2026/27');
    });

    it('formatiert die Jahrhundertwende korrekt', () => {
      expect(schoolYearOf(d('2099-10-01'))).toBe('2099/00');
    });
  });

  describe('schoolYearBounds', () => {
    it('reicht vom 01.09. bis 31.08.', () => {
      expect(schoolYearBounds('2026/27')).toEqual({ from: d('2026-09-01'), to: d('2027-08-31') });
    });

    it('wirft bei ungültigem Schuljahr', () => {
      expect(() => schoolYearBounds('abc')).toThrow('Ungültiges Schuljahr');
    });
  });

  describe('Semester', () => {
    it('September–Jänner ist das 1., Februar–August das 2. Semester', () => {
      expect(semesterOf(d('2026-09-14'))).toBe(1);
      expect(semesterOf(d('2027-01-31'))).toBe(1);
      expect(semesterOf(d('2027-02-01'))).toBe(2);
      expect(semesterOf(d('2027-07-02'))).toBe(2);
    });

    it('liefert die Semester-Zeiträume', () => {
      expect(semesterBounds('2026/27', 1)).toEqual({ from: d('2026-09-01'), to: d('2027-01-31') });
      expect(semesterBounds('2026/27', 2)).toEqual({ from: d('2027-02-01'), to: d('2027-08-31') });
    });

    it('Semestergrenzen und semesterOf stimmen überein', () => {
      const { from, to } = semesterBounds('2026/27', 1);
      expect(semesterOf(from)).toBe(1);
      expect(semesterOf(to)).toBe(1);
    });
  });

  describe('toIsoDate', () => {
    it('formatiert in lokaler Zeit mit führenden Nullen', () => {
      expect(toIsoDate(d('2027-02-03'))).toBe('2027-02-03');
    });
  });

  describe('mondayOf', () => {
    it('liefert den Montag der Woche, auch für Sonntag', () => {
      expect(mondayOf(d('2026-10-07'))).toEqual(d('2026-10-05')); // Mittwoch
      expect(mondayOf(d('2026-10-11'))).toEqual(d('2026-10-05')); // Sonntag
    });
  });

  describe('A/B-Wochen', () => {
    it('die Woche mit dem 1. September ist Woche A (Index 0)', () => {
      expect(schoolWeekIndex(d('2026-09-01'))).toBe(0);
      expect(isWeekA(d('2026-08-31'))).toBe(true); // Montag dieser Woche
    });

    it('wechselt über den Jahreswechsel 2026/27 (53 Kalenderwochen) korrekt ab', () => {
      // Vorher: KW 53 und KW 1 waren beide „B“
      expect(isWeekA(d('2026-12-21'))).toBe(true);  // KW 52
      expect(isWeekA(d('2026-12-28'))).toBe(false); // KW 53
      expect(isWeekA(d('2027-01-04'))).toBe(true);  // KW 1
      expect(isWeekA(d('2027-01-11'))).toBe(false); // KW 2
    });

    it('wechselt in jeder Woche des Schuljahres genau einmal', () => {
      let monday = d('2026-08-31');
      let previous = isWeekA(monday);
      for (let i = 1; i < 52; i++) {
        monday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
        const current = isWeekA(monday);
        expect(current).toBe(!previous);
        previous = current;
      }
    });

    it('bleibt über die Zeitumstellung stabil', () => {
      // Ende Oktober (Winterzeit) und Ende März (Sommerzeit)
      expect(schoolWeekIndex(d('2026-10-26'))).toBe(8);
      expect(schoolWeekIndex(d('2027-03-29'))).toBe(30);
    });

    it('stimmt im Herbst 2026 mit dem bisherigen Verhalten überein (KW 36 = A)', () => {
      expect(isWeekA(d('2026-09-28'))).toBe(true);  // KW 40
      expect(isWeekA(d('2026-10-05'))).toBe(false); // KW 41
    });

    it('beginnt jedes Schuljahr neu mit Woche A', () => {
      expect(isWeekA(d('2027-09-01'))).toBe(true);
    });
  });
});
