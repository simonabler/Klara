/**
 * Bereinigt bestehende Avatar-Uploads (Security-Review 19.10.2026, Punkt 1).
 *
 * - Jede Datei in UPLOAD_DIR, die sharp nicht als JPEG, PNG oder WebP erkennt,
 *   wird nach UPLOAD_DIR/../quarantine/ verschoben (nicht gelöscht).
 * - Gültige Bilder werden wie beim Upload neu kodiert: max. 512×512, WebP,
 *   ohne Metadaten. Dateien, die nicht schon <uuid>.webp heißen, bekommen
 *   einen neuen Namen.
 * - students.avatarUrl wird angepasst; Verweise auf Dateien in Quarantäne
 *   werden auf NULL gesetzt.
 *
 * Aufruf (lokal):  npm run avatars:sanitize -- --dry-run
 * Aufruf (Docker): docker compose exec backend node sanitize-avatars.js --dry-run
 */
import { randomUUID } from 'crypto';
import { mkdir, readdir, readFile, rename, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { AppDataSource } from '../src/datasource';
import { AVATAR_URL_PREFIX } from '../src/app/common/avatar-files';
import {
  avatarUploadDir,
  reencodeAvatar,
  writeFileAtomic,
} from '../src/app/student/avatar-storage.service';

const UUID_WEBP =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

interface Summary {
  checked: number;
  reencoded: number;
  renamed: number;
  quarantined: number;
  failed: number;
  urlsUpdated: number;
  urlsNulled: number;
  missingFiles: string[];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uploadDir = avatarUploadDir();
  const quarantineDir = resolve(uploadDir, '..', 'quarantine');
  const summary: Summary = {
    checked: 0,
    reencoded: 0,
    renamed: 0,
    quarantined: 0,
    failed: 0,
    urlsUpdated: 0,
    urlsNulled: 0,
    missingFiles: [],
  };

  console.log(
    `[sanitize-avatars] ${
      dryRun
        ? 'DRY-RUN – es wird nichts geändert'
        : 'Änderungen werden geschrieben'
    }`
  );
  console.log(`[sanitize-avatars] Upload-Verzeichnis: ${uploadDir}`);
  console.log(`[sanitize-avatars] Quarantäne:         ${quarantineDir}`);

  await AppDataSource.initialize();
  try {
    const entries = await readdir(uploadDir, { withFileTypes: true });
    if (!dryRun) await mkdir(quarantineDir, { recursive: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      summary.checked++;
      const name = entry.name;
      const source = join(uploadDir, name);
      const oldUrl = `${AVATAR_URL_PREFIX}${name}`;

      let webp: Buffer;
      try {
        webp = await reencodeAvatar(await readFile(source));
      } catch {
        // Kein zulässiges Bild → Quarantäne, Verweise entfernen
        summary.quarantined++;
        const refs = await countRefs(oldUrl);
        console.log(
          `  QUARANTÄNE  ${name}${refs ? ` (${refs} Verweis(e) → NULL)` : ''}`
        );
        if (!dryRun) {
          await rename(source, join(quarantineDir, name));
          await AppDataSource.query(
            'UPDATE students SET "avatarUrl" = NULL WHERE "avatarUrl" = $1',
            [oldUrl]
          );
        }
        summary.urlsNulled += refs;
        continue;
      }

      try {
        const target = UUID_WEBP.test(name) ? name : `${randomUUID()}.webp`;
        const newUrl = `${AVATAR_URL_PREFIX}${target}`;
        if (target === name) {
          console.log(`  NEU KODIERT ${name}`);
          if (!dryRun) await writeFileAtomic(source, webp);
        } else {
          const refs = await countRefs(oldUrl);
          console.log(
            `  UMBENANNT   ${name} → ${target}${
              refs ? ` (${refs} Verweis(e))` : ''
            }`
          );
          // Reihenfolge: neue Datei schreiben, DB umstellen, erst dann alte Datei löschen
          if (!dryRun) {
            await writeFileAtomic(join(uploadDir, target), webp);
            await AppDataSource.query(
              'UPDATE students SET "avatarUrl" = $1 WHERE "avatarUrl" = $2',
              [newUrl, oldUrl]
            );
            await unlink(source);
          }
          summary.renamed++;
          summary.urlsUpdated += refs;
        }
        summary.reencoded++;
      } catch (err: any) {
        summary.failed++;
        console.error(`  FEHLER      ${name}: ${err?.message}`);
      }
    }

    // Verweise in der DB, zu denen es (danach) keine Datei mehr gibt – nur melden
    const remaining = new Set(
      dryRun ? entries.map((e) => e.name) : await readdir(uploadDir)
    );
    const rows: { avatarUrl: string }[] = await AppDataSource.query(
      'SELECT DISTINCT "avatarUrl" FROM students WHERE "avatarUrl" LIKE $1',
      [`${AVATAR_URL_PREFIX}%`]
    );
    summary.missingFiles = rows
      .map((r) => r.avatarUrl)
      .filter((url) => !remaining.has(url.slice(AVATAR_URL_PREFIX.length)));
  } finally {
    await AppDataSource.destroy();
  }

  printSummary(summary, dryRun);
  if (summary.failed > 0) process.exitCode = 1;
}

async function countRefs(avatarUrl: string): Promise<number> {
  const [row] = await AppDataSource.query(
    'SELECT COUNT(*) AS count FROM students WHERE "avatarUrl" = $1',
    [avatarUrl]
  );
  return Number(row?.count ?? 0);
}

function printSummary(s: Summary, dryRun: boolean) {
  console.log('');
  console.log(
    `[sanitize-avatars] Zusammenfassung${
      dryRun ? ' (DRY-RUN, nichts geändert)' : ''
    }`
  );
  console.log(`  Dateien geprüft:              ${s.checked}`);
  console.log(`  Neu kodiert (gültige Bilder): ${s.reencoded}`);
  console.log(`  davon umbenannt (.webp):      ${s.renamed}`);
  console.log(`  In Quarantäne verschoben:     ${s.quarantined}`);
  console.log(`  Fehler:                       ${s.failed}`);
  console.log(`  avatarUrl aktualisiert:       ${s.urlsUpdated}`);
  console.log(`  avatarUrl auf NULL gesetzt:   ${s.urlsNulled}`);
  console.log(`  Verweise ohne Datei:          ${s.missingFiles.length}`);
  for (const url of s.missingFiles) console.log(`    - ${url}`);
}

main().catch((err) => {
  console.error('[sanitize-avatars] Abgebrochen:', err);
  process.exit(1);
});
