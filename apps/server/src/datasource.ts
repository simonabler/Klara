import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// .env aus Repo-Wurzel laden
dotenv.config({ path: join(__dirname, '../../../.env') });

/**
 * DataSource für TypeORM CLI (migration:generate, migration:run, migration:show)
 * UND für den Entrypoint im Container.
 *
 * Im CLI-Kontext (ts-node): __dirname = apps/server/src → Pfade zeigen auf .ts
 * Im Container (kompiliert): __dirname = /app         → Pfade zeigen auf .js
 */
const isCompiled = __filename.endsWith('.js');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.TYPEORM_HOST     ?? 'localhost',
  port:     Number(process.env.TYPEORM_PORT ?? 5432),
  username: process.env.TYPEORM_USERNAME ?? 'user',
  password: process.env.TYPEORM_PASSWORD ?? 'CHANGEME',
  database: process.env.TYPEORM_DATABASE ?? 'klara',

  entities:   isCompiled
    ? [join(__dirname, 'app/**/*.entity.js')]
    : [join(__dirname, 'app/**/*.entity.ts')],
  migrations: isCompiled
    ? [join(__dirname, 'migrations/*.js')]
    : [join(__dirname, 'migrations/*.ts')],

  synchronize:   false, // niemals true hier
  migrationsRun: false,
});
