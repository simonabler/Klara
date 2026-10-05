import { unlink } from 'fs/promises';
import { basename, join, resolve } from 'path';
import { Logger } from '@nestjs/common';

const AVATAR_URL_PREFIX = '/api/uploads/avatars/';
const log = new Logger('AvatarFiles');

/**
 * Pfad der Bilddatei zu einer Avatar-URL – nur für hochgeladene Avatare
 * (`/api/uploads/avatars/<datei>`), sonst null (z. B. Google-Profilbilder).
 * `basename` verhindert, dass eine manipulierte URL aus dem Verzeichnis führt.
 */
export function avatarFilePath(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith(AVATAR_URL_PREFIX)) return null;
  const file = basename(avatarUrl.slice(AVATAR_URL_PREFIX.length));
  if (!file || file === '.' || file === '..') return null;
  return join(resolve(process.env.UPLOAD_DIR ?? './uploads/avatars'), file);
}

/**
 * Löscht die Bilddateien zu den Avatar-URLs. Fehlende Dateien sind kein Fehler;
 * andere Fehler werden geloggt, brechen aber den Löschvorgang in der DB nicht ab.
 */
export async function deleteAvatarFiles(avatarUrls: (string | null | undefined)[]): Promise<void> {
  const paths = [...new Set(avatarUrls.map(avatarFilePath).filter((p): p is string => p !== null))];
  await Promise.all(paths.map(async (path) => {
    try {
      await unlink(path);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') log.warn(`Avatar konnte nicht gelöscht werden: ${path} (${err?.message})`);
    }
  }));
}
