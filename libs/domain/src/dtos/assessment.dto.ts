import { AssessmentEventType } from '../enums';

// ── StudentResult ────────────────────────────────────────────────────────────

export class AssessmentEventRefDto {
  id!: string;
  title!: string;
  type!: AssessmentEventType;
  date!: string;
  subjectName?: string;
  className?: string;
}

export class StudentResultDto {
  id!: string;
  studentId!: string;
  assessmentEventId!: string;
  grade?: number;      // 1–5 österreichisch
  points?: number;
  comment?: string;
  updatedAt!: string;
  assessmentEvent?: AssessmentEventRefDto;
}

export class UpsertStudentResultDto {
  studentId!: string;
  grade?: number;
  points?: number;
  comment?: string;
}

// ── AssessmentEvent ──────────────────────────────────────────────────────────

export class AssessmentEventDto {
  id!: string;
  title!: string;
  type!: AssessmentEventType;
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
  type!: AssessmentEventType;
  date!: string;
  classId?: string;
  subjectId?: string;
  // Schüler die diesem Event zugewiesen werden
  studentIds?: string[];
}

export class UpdateAssessmentEventDto {
  title?: string;
  type?: AssessmentEventType;
  date?: string;
  classId?: string;
  subjectId?: string;
}

export class AssignStudentsDto {
  studentIds!: string[];
}
