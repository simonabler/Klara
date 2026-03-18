import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legt die Tabelle für konfigurierbare Leistungstypen an.
 *
 * Jede Lehrkraft hat ihre eigenen Leistungstypen.
 * Standard-Typen (ORAL_CHECK, WRITTEN_CHECK, EXAM) werden On-Demand
 * beim ersten API-Aufruf angelegt (nicht per Migration-Seed, da
 * teacherId zur Laufzeit benötigt wird).
 */
export class AddAssessmentTypes1773600000000 implements MigrationInterface {
  name = 'AddAssessmentTypes1773600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assessment_types" (
        "id"                   uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"                 character varying NOT NULL,
        "schema"               character varying NOT NULL DEFAULT 'GRADES_1_5',
        "maxPoints"            double precision,
        "weight"               double precision,
        "color"                character varying,
        "isDefault"            boolean           NOT NULL DEFAULT false,
        "defaultForEventType"  character varying,
        "teacherId"            uuid              NOT NULL,
        CONSTRAINT "PK_assessment_types" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_assessment_types_teacher'
        ) THEN
          ALTER TABLE "assessment_types"
            ADD CONSTRAINT "FK_assessment_types_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_assessment_types_teacherId"
        ON "assessment_types" ("teacherId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "assessment_types"`);
  }
}
