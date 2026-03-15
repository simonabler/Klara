import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initiale Schema-Migration für Klara.
 *
 * Strategie für Datensicherheit:
 * - Alle CREATE TABLE verwenden IF NOT EXISTS
 * - Alle CREATE INDEX verwenden IF NOT EXISTS
 * - Constraints werden nur hinzugefügt wenn die Tabelle neu erstellt wurde
 *
 * Das bedeutet:
 * - Neue (leere) DB: Alles wird angelegt, System startet sauber
 * - Bestehende Prod-DB: Alle Statements werden übersprungen, kein Datenverlust
 * - TypeORM trägt die Migration als "gelaufen" ein – ab jetzt werden nur
 *   neue Migrations-Dateien ausgeführt
 */
export class InitialSchema1742000000000 implements MigrationInterface {
  name = 'InitialSchema1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── uuid-ossp Extension (muss vor den ersten uuid_generate_v4() Calls da sein) ──
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── teachers ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teachers" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "googleId"    character varying NOT NULL,
        "email"       character varying NOT NULL,
        "displayName" character varying NOT NULL,
        "avatarUrl"   character varying,
        "createdAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teachers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teachers_googleId" UNIQUE ("googleId")
      )
    `);

    // ── subjects ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subjects" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"      character varying NOT NULL,
        "teacherId" uuid              NOT NULL,
        CONSTRAINT "PK_subjects" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_subjects_teacher'
        ) THEN
          ALTER TABLE "subjects"
            ADD CONSTRAINT "FK_subjects_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // ── school_levels ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "school_levels" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"      character varying NOT NULL,
        "year"      character varying,
        "teacherId" uuid              NOT NULL,
        CONSTRAINT "PK_school_levels" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_school_levels_teacher'
        ) THEN
          ALTER TABLE "school_levels"
            ADD CONSTRAINT "FK_school_levels_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // ── classes ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "classes" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"        character varying NOT NULL,
        "schoolYear"  character varying,
        "schoolLevel" integer,
        "teacherId"   uuid              NOT NULL,
        CONSTRAINT "PK_classes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_classes_teacher'
        ) THEN
          ALTER TABLE "classes"
            ADD CONSTRAINT "FK_classes_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // ── students ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "firstName"   character varying NOT NULL,
        "lastName"    character varying NOT NULL,
        "dateOfBirth" TIMESTAMP,
        "avatarUrl"   character varying,
        "teacherId"   uuid              NOT NULL,
        "createdAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_students" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_students_teacher'
        ) THEN
          ALTER TABLE "students"
            ADD CONSTRAINT "FK_students_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // ── parents ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parents" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying NOT NULL,
        "lastName"  character varying NOT NULL,
        "email"     character varying,
        "phone"     character varying,
        "studentId" uuid              NOT NULL,
        CONSTRAINT "PK_parents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_parents_student'
        ) THEN
          ALTER TABLE "parents"
            ADD CONSTRAINT "FK_parents_student"
            FOREIGN KEY ("studentId") REFERENCES "students"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // ── class_students (ManyToMany Join-Tabelle) ──────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "class_students" (
        "classId"   uuid NOT NULL,
        "studentId" uuid NOT NULL,
        CONSTRAINT "PK_class_students" PRIMARY KEY ("classId", "studentId")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_class_students_class'
        ) THEN
          ALTER TABLE "class_students"
            ADD CONSTRAINT "FK_class_students_class"
            FOREIGN KEY ("classId") REFERENCES "classes"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_class_students_student'
        ) THEN
          ALTER TABLE "class_students"
            ADD CONSTRAINT "FK_class_students_student"
            FOREIGN KEY ("studentId") REFERENCES "students"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_class_students_classId"
        ON "class_students" ("classId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_class_students_studentId"
        ON "class_students" ("studentId")
    `);

    // ── notes ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notes" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "content"   text              NOT NULL,
        "type"      character varying NOT NULL DEFAULT 'GENERAL',
        "teacherId" uuid              NOT NULL,
        "studentId" uuid              NOT NULL,
        "subjectId" uuid,
        "classId"   uuid,
        "createdAt" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_notes_teacher'
        ) THEN
          ALTER TABLE "notes"
            ADD CONSTRAINT "FK_notes_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_notes_student'
        ) THEN
          ALTER TABLE "notes"
            ADD CONSTRAINT "FK_notes_student"
            FOREIGN KEY ("studentId") REFERENCES "students"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_notes_subject'
        ) THEN
          ALTER TABLE "notes"
            ADD CONSTRAINT "FK_notes_subject"
            FOREIGN KEY ("subjectId") REFERENCES "subjects"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_notes_class'
        ) THEN
          ALTER TABLE "notes"
            ADD CONSTRAINT "FK_notes_class"
            FOREIGN KEY ("classId") REFERENCES "classes"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // ── assessment_events ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assessment_events" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "title"     character varying NOT NULL,
        "type"      character varying NOT NULL DEFAULT 'ORAL_CHECK',
        "date"      date              NOT NULL,
        "teacherId" uuid              NOT NULL,
        "classId"   uuid,
        "subjectId" uuid,
        "createdAt" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessment_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_assessment_events_teacher'
        ) THEN
          ALTER TABLE "assessment_events"
            ADD CONSTRAINT "FK_assessment_events_teacher"
            FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_assessment_events_class'
        ) THEN
          ALTER TABLE "assessment_events"
            ADD CONSTRAINT "FK_assessment_events_class"
            FOREIGN KEY ("classId") REFERENCES "classes"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_assessment_events_subject'
        ) THEN
          ALTER TABLE "assessment_events"
            ADD CONSTRAINT "FK_assessment_events_subject"
            FOREIGN KEY ("subjectId") REFERENCES "subjects"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // ── student_results ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_results" (
        "id"                uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "grade"             integer,
        "points"            double precision,
        "comment"           text,
        "assessmentEventId" uuid      NOT NULL,
        "studentId"         uuid      NOT NULL,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_results" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_student_results_event'
        ) THEN
          ALTER TABLE "student_results"
            ADD CONSTRAINT "FK_student_results_event"
            FOREIGN KEY ("assessmentEventId") REFERENCES "assessment_events"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_student_results_student'
        ) THEN
          ALTER TABLE "student_results"
            ADD CONSTRAINT "FK_student_results_student"
            FOREIGN KEY ("studentId") REFERENCES "students"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "security_block"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "metric_route"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "metric_meta"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "metric_daily"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assessment_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_students"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "classes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "school_levels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subjects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teachers"`);
  }
}
