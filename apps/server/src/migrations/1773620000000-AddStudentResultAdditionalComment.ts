import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentResultAdditionalComment1773620000000 implements MigrationInterface {
  name = 'AddStudentResultAdditionalComment1773620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_results"
      ADD COLUMN IF NOT EXISTS "additionalComment" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_results"
      DROP COLUMN IF EXISTS "additionalComment"
    `);
  }
}
