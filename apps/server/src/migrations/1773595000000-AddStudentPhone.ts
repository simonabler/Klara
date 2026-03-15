import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fügt die optionale Telefonnummer zur students-Tabelle hinzu.
 * Das Feld ist nullable – bestehende Datensätze sind nicht betroffen.
 */
export class AddStudentPhone1773595000000 implements MigrationInterface {
  name = 'AddStudentPhone1773595000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        ADD COLUMN IF NOT EXISTS "phone" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        DROP COLUMN IF EXISTS "phone"
    `);
  }
}
