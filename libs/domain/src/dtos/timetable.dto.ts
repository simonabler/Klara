import { RepeatType, WeekVariant } from '../enums';

// ── Create DTO ──────────────────────────────────────────────────────────────

export class CreateTimetableEntryDto {
  subjectId!: string;
  classId!: string;

  /** 1 = Montag … 5 = Freitag */
  dayOfWeek!: number;

  /** Unterrichtsstunden-Nummer (1–10) */
  period!: number;

  room?: string;

  repeatType!: RepeatType;

  /** Nur bei BIWEEKLY: 'A' | 'B' | 'BOTH' */
  weekVariant?: WeekVariant;

  /** Nur bei SEMESTER: 1 | 2 */
  semester?: number;

  /** Nur bei ONCE: ISO-Datum (YYYY-MM-DD) */
  onceDate?: string;

  /** Optionaler Gültigkeitsstart (ISO-Datum) */
  validFrom?: string;

  /** Optionales Gültigkeitsende (ISO-Datum) */
  validTo?: string;

  /** Hex-Farbe z.B. '#5B8AC0' */
  color?: string;

  /** z.B. '2025/26' */
  schoolYear!: string;
}

// ── Update DTO ──────────────────────────────────────────────────────────────

export class UpdateTimetableEntryDto {
  subjectId?: string;
  classId?: string;
  dayOfWeek?: number;
  period?: number;
  room?: string;
  repeatType?: RepeatType;
  weekVariant?: WeekVariant;
  semester?: number;
  onceDate?: string;
  validFrom?: string;
  validTo?: string;
  color?: string;
  schoolYear?: string;
}

// ── Response DTO ─────────────────────────────────────────────────────────────

export class TimetableEntryDto {
  id!: string;
  teacherId!: string;
  subjectId!: string;
  subjectName!: string;
  classId!: string;
  className!: string;
  dayOfWeek!: number;
  period!: number;
  room!: string | null;
  repeatType!: RepeatType;
  weekVariant!: WeekVariant | null;
  semester!: number | null;
  onceDate!: string | null;
  validFrom!: string | null;
  validTo!: string | null;
  color!: string | null;
  schoolYear!: string;
  createdAt!: string;
  updatedAt!: string;
}
