/** Minimale Klassenform für die Planung (id, Schuljahr, Schüler-IDs) */
export interface ClassWithStudents {
  id: string;
  schoolYear: string | null;
  students?: { id: string }[];
}

/**
 * Welche Schüler/innen werden beim Löschen eines Schuljahres mitgelöscht?
 *
 * Gelöscht wird, wer ausschließlich in Klassen dieses Schuljahres ist.
 * Wer zusätzlich in einer anderen Klasse ist (z. B. schon im neuen Schuljahr),
 * bleibt erhalten – nur die Daten des alten Schuljahres verschwinden.
 */
export function planStudentDeletion(
  schoolYear: string,
  allClasses: ClassWithStudents[],
): { toDelete: Set<string>; kept: Set<string> } {
  const inYear = new Set<string>();
  const elsewhere = new Set<string>();
  for (const cls of allClasses) {
    const target = cls.schoolYear === schoolYear ? inYear : elsewhere;
    for (const s of cls.students ?? []) target.add(s.id);
  }
  const toDelete = new Set([...inYear].filter((id) => !elsewhere.has(id)));
  const kept = new Set([...inYear].filter((id) => elsewhere.has(id)));
  return { toDelete, kept };
}
