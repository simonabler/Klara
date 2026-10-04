import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fügt die Spalte "ptmValue" zu "student_results" hinzu.
 *
 * Hintergrund:
 * Bisher wurde das Feld "comment" für zwei verschiedene Zwecke genutzt:
 *   1. Strukturierter Bewertungswert bei PTM-Schemas ('+', '~', '-', 'bestanden', 'nicht bestanden')
 *   2. Freitext-Kommentar der Lehrkraft
 *
 * Fix: Eigene Spalte "ptmValue" für den strukturierten Wert.
 *
 * Datenmigration (UP):
 *   Für alle student_results, deren zugehöriges assessment_event ein
 *   PLUS_TILDE_MINUS- oder PASS_FAIL-Schema hat, wird der bisherige
 *   comment-Wert nach ptmValue verschoben und comment auf NULL gesetzt.
 *
 * Das Schema wird ermittelt über:
 *   - assessment_events.type ist eine UUID → JOIN auf assessment_types.id
 *   - assessment_events.type ist ein Enum-String → JOIN auf assessment_types.defaultForEventType
 */
export class AddStudentResultPtmValue1773620000000 implements MigrationInterface {
  name = 'AddStudentResultPtmValue1773620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Spalte hinzufügen
    await queryRunner.query(`
      ALTER TABLE "student_results"
      ADD COLUMN IF NOT EXISTS "ptmValue" text NULL
    `);

    // 2. Bestehende Daten migrieren:
    //    comment → ptmValue für alle Einträge mit PTM-Schema
    //    Zwei Fälle: type ist UUID (neuere Events) oder Enum-String (alte Events)
    await queryRunner.query(`
      UPDATE "student_results" sr
      SET
        "ptmValue" = sr."comment",
        "comment"  = NULL
      FROM "assessment_events" ae
      LEFT JOIN "assessment_types" at_by_id
        ON ae."type" = at_by_id."id"
      LEFT JOIN "assessment_types" at_by_enum
        ON ae."type" = at_by_enum."defaultForEventType"
      WHERE
        sr."assessmentEventId" = ae."id"
        AND sr."comment" IS NOT NULL
        AND COALESCE(at_by_id."schema", at_by_enum."schema") IN ('PLUS_TILDE_MINUS', 'PASS_FAIL')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rückrichtung: ptmValue → comment (comment war vorher NULL für diese Zeilen)
    await queryRunner.query(`
      UPDATE "student_results" sr
      SET
        "comment"  = sr."ptmValue",
        "ptmValue" = NULL
      FROM "assessment_events" ae
      LEFT JOIN "assessment_types" at_by_id
        ON ae."type" = at_by_id."id"
      LEFT JOIN "assessment_types" at_by_enum
        ON ae."type" = at_by_enum."defaultForEventType"
      WHERE
        sr."assessmentEventId" = ae."id"
        AND sr."ptmValue" IS NOT NULL
        AND COALESCE(at_by_id."schema", at_by_enum."schema") IN ('PLUS_TILDE_MINUS', 'PASS_FAIL')
    `);

    await queryRunner.query(`
      ALTER TABLE "student_results"
      DROP COLUMN IF EXISTS "ptmValue"
    `);
  }
}
