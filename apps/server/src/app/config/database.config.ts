import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const sslEnv = process.env.TYPEORM_SSL;
  const sslRejectEnv = process.env.TYPEORM_SSL_REJECT_UNAUTHORIZED;
  const syncEnv = process.env.TYPEORM_SYNC;
  const migrationsRunEnv = process.env.TYPEORM_MIGRATIONS_RUN;
  return {
    // Postgres connection string (e.g. postgres://user:pass@host:5432/db)
    url: process.env.TYPEORM_URL || null,
    host: process.env.TYPEORM_HOST || null,
    port: process.env.TYPEORM_PORT ? Number(process.env.TYPEORM_PORT) : null,
    username: process.env.TYPEORM_USERNAME || null,
    password: process.env.TYPEORM_PASSWORD || null,
    database: process.env.TYPEORM_DATABASE || null,
    // Enable SSL for Postgres
    ssl: sslEnv === '1' || sslEnv === 'true',
    // When SSL enabled, whether to reject unauthorized certs (default true)
    sslRejectUnauthorized: sslRejectEnv === undefined ? true : !(sslRejectEnv === '0' || sslRejectEnv === 'false'),
    // SQLite fallback path (used when no url is present)
    sqlitePath: process.env.TYPEORM_DB ?? './dev.sqlite',
    // synchronize: Nur explizit in Entwicklung auf true setzen (TYPEORM_SYNC=true).
    // Default false – Produktion verwendet Migrations.
    synchronize: syncEnv === '1' || syncEnv === 'true',
    // migrationsRun: Migrations beim App-Start automatisch ausführen.
    // In Produktion: true (via TYPEORM_MIGRATIONS_RUN=true oder Entrypoint-Script).
    // In Entwicklung mit synchronize=true: false (nicht nötig).
    migrationsRun: migrationsRunEnv === '1' || migrationsRunEnv === 'true',
  } as const;
});
