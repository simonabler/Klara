#!/bin/sh
set -e

ENV_FILE=".env.$NODE_ENV"

if [ -f "$ENV_FILE" ]; then
  set -o allexport
  . "./$ENV_FILE"
  set +o allexport
fi

echo "[klara] Running database migrations..."
node -e "
const { DataSource } = require('typeorm');
const path = require('path');

const ds = new DataSource({
  type: 'postgres',
  host:     process.env.TYPEORM_HOST     || 'localhost',
  port:     Number(process.env.TYPEORM_PORT || 5432),
  username: process.env.TYPEORM_USERNAME || 'user',
  password: process.env.TYPEORM_PASSWORD || 'CHANGEME',
  database: process.env.TYPEORM_DATABASE || 'klara',
  entities:   [],
  migrations: [path.join(__dirname, 'migrations', '*.js')],
  synchronize:   false,
  migrationsRun: false,
});

ds.initialize()
  .then(() => ds.runMigrations())
  .then((ran) => {
    if (ran.length === 0) {
      console.log('[klara] No pending migrations.');
    } else {
      console.log('[klara] Migrations applied: ' + ran.map(function(m){ return m.name; }).join(', '));
    }
    return ds.destroy();
  })
  .then(() => process.exit(0))
  .catch(function(e) {
    console.error('[klara] Migration failed:', e.message);
    process.exit(1);
  });
"

echo "[klara] Starting app..."
node main.js
