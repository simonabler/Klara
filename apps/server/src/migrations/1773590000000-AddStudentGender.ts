import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fügt das Geschlecht zur students-Tabelle hinzu.
 *
 * Erlaubte Werte: 'm' (männlich), 'w' (weiblich), 'd' (divers)
 * Das Feld ist nullable – bestehende Datensätze sind nicht betroffen.
 */
export class AddStudentGender1773590000000 implements MigrationInterface {
  name = 'AddStudentGender1773590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        ADD COLUMN IF NOT EXISTS "gender" varchar(1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        DROP COLUMN IF EXISTS "gender"
    `);
  }
}
