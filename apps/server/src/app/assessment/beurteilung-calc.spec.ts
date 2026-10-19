import { AssessmentSchema } from '@app/domain';
import {
  AssessmentTypeLike,
  averageScale,
  resolveType,
  schemaFor,
  weightedAverage,
  weightFor,
} from './beurteilung-calc';

const type = (overrides: Partial<AssessmentTypeLike>): AssessmentTypeLike => ({
  id: 't1',
  schema: AssessmentSchema.GRADES_1_5,
  weight: null,
  color: null,
  defaultForEventType: null,
  ...overrides,
});

describe('beurteilung-calc', () => {
  describe('resolveType', () => {
    const exam = type({ id: 'uuid-exam', defaultForEventType: 'EXAM' });
    const custom = type({ id: 'uuid-custom' });

    it('findet den Typ über die ID', () => {
      expect(resolveType('uuid-custom', [exam, custom])).toBe(custom);
    });

    it('findet ältere Events über den Enum-Wert', () => {
      expect(resolveType('EXAM', [exam, custom])).toBe(exam);
    });

    it('liefert undefined ohne Treffer', () => {
      expect(resolveType('ORAL_CHECK', [exam])).toBeUndefined();
    });
  });

  describe('schemaFor', () => {
    it('nimmt das Schema des Typs', () => {
      expect(schemaFor('x', type({ schema: AssessmentSchema.POINTS }))).toBe(AssessmentSchema.POINTS);
    });

    it('fällt ohne Typ auf die Standard-Typen zurück', () => {
      expect(schemaFor('EXAM', undefined)).toBe(AssessmentSchema.GRADES_1_5);
      expect(schemaFor('ORAL_CHECK', undefined)).toBe(AssessmentSchema.PLUS_TILDE_MINUS);
    });
  });

  describe('weightFor', () => {
    it('nutzt das konfigurierte Gewicht', () => {
      expect(weightFor(type({ weight: 2 }))).toBe(2);
    });

    it('zählt ohne, mit 0 oder negativem Gewicht einfach', () => {
      expect(weightFor(undefined)).toBe(1);
      expect(weightFor(type({ weight: null }))).toBe(1);
      expect(weightFor(type({ weight: 0 }))).toBe(1);
      expect(weightFor(type({ weight: -1 }))).toBe(1);
    });
  });

  describe('averageScale', () => {
    it('bevorzugt die Skala 1–5', () => {
      expect(averageScale([AssessmentSchema.GRADES_1_10, AssessmentSchema.GRADES_1_5])).toBe(AssessmentSchema.GRADES_1_5);
    });

    it('nimmt 1–10, wenn es keine 1–5-Leistungen gibt', () => {
      expect(averageScale([AssessmentSchema.POINTS, AssessmentSchema.GRADES_1_10])).toBe(AssessmentSchema.GRADES_1_10);
    });

    it('liefert undefined ohne Notenschemata', () => {
      expect(averageScale([AssessmentSchema.POINTS, AssessmentSchema.PLUS_TILDE_MINUS])).toBeUndefined();
    });
  });

  describe('weightedAverage', () => {
    it('gewichtet die Werte', () => {
      // Schularbeit 2 (×2) und Test 4 (×1) → (4 + 4) / 3 = 2,67 → 2,7
      expect(weightedAverage([{ value: 2, weight: 2 }, { value: 4, weight: 1 }])).toBe(2.7);
    });

    it('ist bei gleichen Gewichten der normale Mittelwert', () => {
      expect(weightedAverage([{ value: 1, weight: 1 }, { value: 2, weight: 1 }])).toBe(1.5);
    });

    it('liefert undefined ohne Werte', () => {
      expect(weightedAverage([])).toBeUndefined();
    });
  });
});
