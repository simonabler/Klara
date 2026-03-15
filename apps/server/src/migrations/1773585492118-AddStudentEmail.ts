import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fügt die optionale E-Mail-Adresse zur students-Tabelle hinzu.
 *
 * Hintergrund: Schülerinnen und Schüler können nun eine eigene E-Mail-Adresse
 * bekommen (unabhängig von der E-Mail der Erziehungsberechtigten).
 * Das Feld ist nullable – bestehende Datensätze sind nicht betroffen.
 */
export class AddStudentEmail1773585492118 implements MigrationInterface {
  name = 'AddStudentEmail1773585492118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        ADD COLUMN IF NOT EXISTS "email" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        DROP COLUMN IF EXISTS "email"
    `);
  }
}
