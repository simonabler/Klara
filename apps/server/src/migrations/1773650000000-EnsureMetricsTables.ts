import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stellt sicher, dass die Tabellen des Metrics-Moduls existieren.
 *
 * Sie werden eigentlich von InitialSchema angelegt. Datenbanken, die vor der
 * Einführung der Migrations per TYPEORM_SYNC aufgebaut wurden (als das
 * Metrics-Modul noch nicht eingebunden war), haben sie aber nicht – dann bricht
 * der Start mit „relation "metric_meta" does not exist“ ab.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS, gleiche Definition wie InitialSchema).
 * down() entfernt nichts: die Tabellen gehören zu InitialSchema.
 */
export class EnsureMetricsTables1773650000000 implements MigrationInterface {
  name = 'EnsureMetricsTables1773650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── metrics ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metric_daily" (
        "day"       date         NOT NULL,
        "count"     integer      NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metric_daily" PRIMARY KEY ("day")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metric_meta" (
        "id"         character varying(64) NOT NULL,
        "startedAt"  TIMESTAMPTZ           NOT NULL,
        "totalCount" bigint                NOT NULL DEFAULT 0,
        "createdAt"  TIMESTAMPTZ           NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMPTZ           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metric_meta" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metric_route" (
        "route"      character varying(256) NOT NULL,
        "count"      integer                NOT NULL DEFAULT 0,
        "methods"    jsonb                  NOT NULL DEFAULT '{}',
        "statuses"   jsonb                  NOT NULL DEFAULT '{}',
        "sumMs"      double precision       NOT NULL DEFAULT 0,
        "minMs"      double precision       NOT NULL DEFAULT 0,
        "maxMs"      double precision       NOT NULL DEFAULT 0,
        "lastCallAt" TIMESTAMPTZ,
        "createdAt"  TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metric_route" PRIMARY KEY ("route")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "security_block" (
        "ip"        character varying(128) NOT NULL,
        "until"     TIMESTAMPTZ            NOT NULL,
        "reason"    text                   NOT NULL,
        "strikes"   integer                NOT NULL DEFAULT 1,
        "meta"      jsonb,
        "createdAt" TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_security_block" PRIMARY KEY ("ip")
      )
    `);
  }

  public async down(): Promise<void> {
    // bewusst leer – siehe Kommentar oben
  }
}
