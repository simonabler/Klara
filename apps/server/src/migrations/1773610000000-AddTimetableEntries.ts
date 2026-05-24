import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fügt die timetable_entries-Tabelle hinzu.
 *
 * Speichert Stundenplan-Regeln pro Lehrkraft:
 *   - Fach, Klasse, Tag, Stunde, Raum
 *   - Wiederholungstyp: WEEKLY | BIWEEKLY | SEMESTER | ONCE
 *   - A/B-Wochen-Variante (nur bei BIWEEKLY)
 *   - Semester 1/2 (nur bei SEMESTER)
 *   - Konkretes Datum (nur bei ONCE)
 *   - Optionaler Gültigkeitszeitraum (validFrom / validTo)
 *   - Hex-Farbe für die Darstellung
 *
 * Strategie: IF NOT EXISTS – sicher auf bestehenden Datenbanken.
 */
export class AddTimetableEntries1773610000000 implements MigrationInterface {
  name = 'AddTimetableEntries1773610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "timetable_entries" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId"   uuid              NOT NULL,
        "subjectId"   uuid              NOT NULL,
        "classId"     uuid              NOT NULL,
        "dayOfWeek"   integer           NOT NULL,
        "period"      integer           NOT NULL,
        "room"        character varying,
        "repeatType"  character varying NOT NULL DEFAULT 'WEEKLY',
        "weekVariant" character varying,
        "semester"    integer,
        "onceDate"    date,
        "validFrom"   date,
        "validTo"     date,
        "color"       character varying,
        "schoolYear"  character varying NOT NULL,
        "createdAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_timetable_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_timetable_entries_teacher"
          FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_timetable_entries_subject"
          FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_timetable_entries_class"
          FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE
      )
    `);

    // Indizes für häufige Abfragen (Lehrkraft + Schuljahr, Lehrkraft + Tag)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_timetable_teacher_year"
        ON "timetable_entries" ("teacherId", "schoolYear")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_timetable_teacher_day"
        ON "timetable_entries" ("teacherId", "dayOfWeek")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_timetable_teacher_day"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_timetable_teacher_year"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "timetable_entries"`);
  }
}
