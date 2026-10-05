/**
 * Auskunft über alle zu einer Schülerin / einem Schüler gespeicherten Daten
 * (DSGVO Art. 15). Datumswerte als ISO-Strings.
 */
export class StudentDataExportDto {
  exportVersion!: string;
  exportedAt!: string;

  /** Lehrkraft, die die Daten in Klara führt */
  responsible!: { displayName: string; email: string };
  /** Eingestellte Aufbewahrungsdauer in Jahren nach Schuljahresende; null = keine Frist */
  retentionYears!: number | null;

  student!: {
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    hasProfilePhoto: boolean;
    createdAt: string;
    updatedAt: string;
  };

  parents!: { firstName: string; lastName: string; email: string | null; phone: string | null }[];

  classes!: { name: string; schoolYear: string | null; schoolLevel: number | null }[];

  results!: {
    date: string;
    title: string;
    assessmentType: string;
    subject: string | null;
    class: string | null;
    grade: number | null;
    points: number | null;
    value: string | null;
    comment: string | null;
    recordedAt: string;
  }[];

  notes!: {
    createdAt: string;
    type: string;
    content: string;
    subject: string | null;
    class: string | null;
  }[];
}
