import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';

/**
 * Glob für die kompilierten Migrations neben main.js (dist/apps/server/migrations).
 *
 * Fehlt das Verzeichnis oder ist es leer, obwohl Migrations beim Start laufen
 * sollen, wird laut gewarnt – TypeORM selbst meldet einen falschen Pfad nicht,
 * sondern führt dann einfach nichts aus.
 */
export function resolveMigrationsGlob(baseDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const dir = join(baseDir, 'migrations');
  const wantsRun = env.TYPEORM_MIGRATIONS_RUN === 'true' || env.TYPEORM_MIGRATIONS_RUN === '1';
  const hasFiles = existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.js'));
  if (wantsRun && !hasFiles) {
    new Logger('Migrations').warn(
      `TYPEORM_MIGRATIONS_RUN ist aktiv, aber in ${dir} liegen keine Migrations. ` +
      'Vor dem Build „npx tsc -p apps/server/tsconfig.typeorm.json“ ausführen oder „npm run migration:run“ verwenden.',
    );
  }
  return join(dir, '*.js');
}
