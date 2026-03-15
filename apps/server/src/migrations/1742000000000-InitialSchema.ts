import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline-Migration – hält den initialen Schemastand fest.
 *
 * Diese Migration enthält bewusst keinen SQL-Code: Die Datenbank wurde
 * bisher via TypeORM synchronize: true aufgebaut und hat bereits das
 * korrekte Schema. Diese Datei dient ausschließlich als Startpunkt für
 * alle zukünftigen Migrations.
 *
 * Beim ersten Deployment gegen eine leere DB würde diese Migration leer
 * durchlaufen – das Schema wird dann von der nächsten inhaltlichen
 * Migration oder (in Dev) via TYPEORM_SYNC=true aufgebaut.
 *
 * WICHTIG: Niemals nachträglich bearbeiten, nachdem diese Migration in
 * Produktion eingetragen wurde (TypeORM prüft den Hash).
 */
export class InitialSchema1742000000000 implements MigrationInterface {
  name = 'InitialSchema1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Kein SQL nötig – DB-Schema bereits via synchronize: true vorhanden.
    // Diese Migration markiert nur den Startpunkt für den Migrations-Workflow.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback der Baseline ist nicht vorgesehen.
  }
}
