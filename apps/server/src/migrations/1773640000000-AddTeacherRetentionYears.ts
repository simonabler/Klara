import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aufbewahrungsdauer pro Lehrkraft (Jahre nach Schuljahresende).
 * NULL = keine Frist gesetzt – es wird nichts zur Löschung vorgeschlagen.
 */
export class AddTeacherRetentionYears1773640000000 implements MigrationInterface {
  name = 'AddTeacherRetentionYears1773640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "teachers"
        ADD COLUMN IF NOT EXISTS "retentionYears" integer NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "teachers"
        DROP COLUMN IF EXISTS "retentionYears"
    `);
  }
}
