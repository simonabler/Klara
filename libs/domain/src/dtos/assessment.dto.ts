import { AssessmentEventType, AssessmentSchema } from '../enums';

// ── StudentResult ────────────────────────────────────────────────────────────

export class AssessmentEventRefDto {
  id!: string;
  title!: string;
  type!: string;
  date!: string;
  subjectId?: string;
  subjectName?: string;
  className?: string;
}

export class StudentResultDto {
  id!: string;
  studentId!: string;
  assessmentEventId!: string;
  grade?: number;      // 1–5 österreichisch
  points?: number;
  ptmValue?: string;   // '+', '~', '-', 'bestanden', 'nicht bestanden'
  comment?: string;
  updatedAt!: string;
  assessmentEvent?: AssessmentEventRefDto;
}

export class UpsertStudentResultDto {
  studentId!: string;
  grade?: number;
  points?: number;
  ptmValue?: string;
  comment?: string;
}

// ── AssessmentEvent ──────────────────────────────────────────────────────────

export class AssessmentEventDto {
  id!: string;
  title!: string;
  type!: string;
  date!: string;
  teacherId!: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  results!: StudentResultDto[];
  createdAt!: string;
}

export class CreateAssessmentEventDto {
  title!: string;
  type!: string;
  date!: string;
  classId?: string;
  subjectId?: string;
  // Schüler die diesem Event zugewiesen werden
  studentIds?: string[];
}

export class UpdateAssessmentEventDto {
  title?: string;
  type?: string;
  date?: string;
  classId?: string;
  subjectId?: string;
}

export class AssignStudentsDto {
  studentIds!: string[];
}

// ── AssessmentType ────────────────────────────────────────────────────────────

export class AssessmentTypeDto {
  id!: string;
  name!: string;
  schema!: AssessmentSchema;
  maxPoints?: number;
  weight?: number;
  color?: string;
  isDefault!: boolean;
  defaultForEventType?: string;
}

export class CreateAssessmentTypeDto {
  name!: string;
  schema!: AssessmentSchema;
  maxPoints?: number;
  weight?: number;
  color?: string;
}

export class UpdateAssessmentTypeDto {
  name?: string;
  schema?: AssessmentSchema;
  maxPoints?: number;
  weight?: number;
  color?: string;
}

// ── Beurteilung Tabellenansicht ───────────────────────────────────────────────

export class TableCellDto {
  /** Rohwert: Note (1-5), Punkte, '+', '~', '-', 'bestanden', etc. */
  value?: string | number;
  resultId?: string;
  comment?: string;
}

export class TableStudentRowDto {
  studentId!: string;
  firstName!: string;
  lastName!: string;
  avatarUrl?: string;
  noteCount!: number;
  /** Map von assessmentEventId → Zellinhalt */
  cells!: Record<string, TableCellDto>;
  /** Berechneter Ø-Wert (nur wenn gradingEnabled) */
  gradeAverage?: number;
}

export class TableEventColumnDto {
  id!: string;
  title!: string;
  date!: string;
  schema!: string;
  weight?: number;
  color?: string;
}

export class BeurteilungTableDto {
  columns!: TableEventColumnDto[];
  rows!: TableStudentRowDto[];
  /** Klassendurchschnitt (nur wenn gradingEnabled) */
  classAverage?: number;
  gradingEnabled!: boolean;
}
