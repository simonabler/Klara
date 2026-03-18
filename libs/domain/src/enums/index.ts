export enum NoteType {
  PARTICIPATION = 'PARTICIPATION',
  BEHAVIOUR = 'BEHAVIOUR',
  GENERAL = 'GENERAL',
}

export enum AssessmentEventType {
  ORAL_CHECK = 'ORAL_CHECK',
  WRITTEN_CHECK = 'WRITTEN_CHECK',
  EXAM = 'EXAM',
}

export enum Gender {
  MALE    = 'm',
  FEMALE  = 'w',
  DIVERSE = 'd',
}

export enum AssessmentSchema {
  GRADES_1_5    = 'GRADES_1_5',    // 1–5
  GRADES_1_10   = 'GRADES_1_10',   // 1–10
  PLUS_TILDE_MINUS = 'PLUS_TILDE_MINUS', // +/~/−
  POINTS        = 'POINTS',        // freie Punkte
  PASS_FAIL     = 'PASS_FAIL',     // Bestanden/Nicht bestanden
}
