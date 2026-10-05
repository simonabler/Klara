// ── Schuljahreswechsel ───────────────────────────────────────────────────────

export class RolloverClassDto {
  /** Klasse im bisherigen Schuljahr */
  sourceClassId!: string;
  /** Name im neuen Schuljahr, z. B. '4A' */
  name!: string;
  schoolLevel?: number;
}

export class RolloverRequestDto {
  fromSchoolYear!: string;
  toSchoolYear!: string;
  classes!: RolloverClassDto[];
}

export class RolloverResultDto {
  created!: { id: string; name: string; schoolYear: string; studentCount: number }[];
}

// ── Aufbewahrung / Löschfristen ──────────────────────────────────────────────

export class RetentionSettingsDto {
  /** Jahre nach Schuljahresende; null = keine Frist */
  retentionYears!: number | null;
}

export class RetentionYearDto {
  schoolYear!: string;
  /** Ab diesem Tag (YYYY-MM-DD) ist das Schuljahr zur Löschung fällig */
  deletableFrom!: string;
  classes!: { id: string; name: string; studentCount: number }[];
  noteCount!: number;
  assessmentCount!: number;
  /** Schüler/innen, die nur in Klassen dieses Schuljahres sind und gelöscht werden */
  studentsToDelete!: number;
  /** Schüler/innen, die auch in anderen Klassen sind und erhalten bleiben */
  studentsKept!: number;
}

export class RetentionOverviewDto {
  retentionYears!: number | null;
  /** Schuljahre, deren Frist abgelaufen ist */
  due!: RetentionYearDto[];
}

export class PurgeRequestDto {
  schoolYear!: string;
}

export class PurgeResultDto {
  schoolYear!: string;
  deletedClasses!: number;
  deletedStudents!: number;
  deletedNotes!: number;
  deletedAssessments!: number;
  deletedTimetableEntries!: number;
}
