import { AssessmentSchema } from '@app/domain';
import { DEFAULT_TYPES } from './assessment-type.service';

/** Felder eines Leistungstyps, die für die Beurteilung gebraucht werden */
export interface AssessmentTypeLike {
  id: string;
  schema: AssessmentSchema | string;
  weight: number | null;
  color: string | null;
  defaultForEventType: string | null;
}

/** Schemata, deren Werte Noten sind und in einen Notenschnitt einfließen können */
export const GRADE_SCHEMAS: readonly AssessmentSchema[] = [
  AssessmentSchema.GRADES_1_5,
  AssessmentSchema.GRADES_1_10,
];

/**
 * Leistungstyp eines Events finden.
 * `event.type` ist entweder die ID eines Leistungstyps oder (ältere Events)
 * ein Enum-Wert wie 'EXAM', der über `defaultForEventType` zugeordnet wird.
 */
export function resolveType(
  eventType: string,
  types: AssessmentTypeLike[],
): AssessmentTypeLike | undefined {
  return types.find((t) => t.id === eventType) ?? types.find((t) => t.defaultForEventType === eventType);
}

/** Schema eines Events – ohne passenden Typ wie bei den Standard-Typen (Schularbeit = 1–5) */
export function schemaFor(eventType: string, type: AssessmentTypeLike | undefined): AssessmentSchema {
  if (type) return type.schema as AssessmentSchema;
  return DEFAULT_TYPES.find((d) => d.defaultForEventType === eventType)?.schema ?? AssessmentSchema.GRADES_1_5;
}

/** Gewicht eines Typs; ohne oder mit ungültigem Gewicht zählt er einfach (1) */
export function weightFor(type: AssessmentTypeLike | undefined): number {
  const w = type?.weight;
  return typeof w === 'number' && w > 0 ? w : 1;
}

/**
 * Notenskala, aus der der Ø berechnet wird.
 * Skalen werden nie gemischt (eine 8 auf 1–10 ist keine 8 auf 1–5):
 * Gibt es Leistungen auf 1–5, zählt nur diese Skala, sonst 1–10.
 */
export function averageScale(schemas: AssessmentSchema[]): AssessmentSchema | undefined {
  return GRADE_SCHEMAS.find((s) => schemas.includes(s));
}

/** Gewichteter Mittelwert, auf eine Nachkommastelle gerundet; leer → undefined */
export function weightedAverage(values: { value: number; weight: number }[]): number | undefined {
  const weightSum = values.reduce((sum, v) => sum + v.weight, 0);
  if (weightSum <= 0) return undefined;
  const sum = values.reduce((acc, v) => acc + v.value * v.weight, 0);
  return Math.round((sum / weightSum) * 10) / 10;
}
