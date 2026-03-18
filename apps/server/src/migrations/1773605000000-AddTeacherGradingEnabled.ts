import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fügt den Notenberechnung-Toggle zur teachers-Tabelle hinzu.
 * Default: false — Feature ist standardmäßig deaktiviert.
 */
export class AddTeacherGradingEnabled1773605000000 implements MigrationInterface {
  name = 'AddTeacherGradingEnabled1773605000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "teachers"
        ADD COLUMN IF NOT EXISTS "gradingEnabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "teachers"
        DROP COLUMN IF EXISTS "gradingEnabled"
    `);
  }
}
