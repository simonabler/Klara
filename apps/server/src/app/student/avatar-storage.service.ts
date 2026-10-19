import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import sharp from 'sharp';
import { AVATAR_URL_PREFIX } from '../common/avatar-files';

/** Formate, die sharp im hochgeladenen Inhalt erkennen muss */
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
/** Schutz gegen Decompression-Bomben (kleine Datei, riesige Pixelzahl) */
export const MAX_INPUT_PIXELS = 40_000_000;
/** Kantenlänge, auf die Avatare höchstens verkleinert werden */
const AVATAR_SIZE = 512;

export const INVALID_IMAGE_MESSAGE = 'Nur JPEG, PNG und WebP sind erlaubt';

/** Verzeichnis der Avatare – erst beim Aufruf lesen, weil .env später geladen wird */
export function avatarUploadDir(): string {
  return resolve(process.env.UPLOAD_DIR ?? './uploads/avatars');
}

/**
 * Prüft den Inhalt (nicht Dateiname oder MIME-Typ des Clients) und kodiert
 * das Bild immer neu als WebP. Dabei gehen alle Metadaten verloren, auch
 * EXIF/GPS – das ist aus Datenschutzgründen gewollt.
 */
export async function reencodeAvatar(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .metadata()
    .catch(() => null);
  if (!meta?.format || !ALLOWED_FORMATS.includes(meta.format)) {
    throw new BadRequestException(INVALID_IMAGE_MESSAGE);
  }
  if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_INPUT_PIXELS) {
    throw new BadRequestException('Das Bild ist zu groß');
  }

  try {
    return await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // nach EXIF ausrichten, bevor die Metadaten wegfallen
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new BadRequestException('Das Bild konnte nicht verarbeitet werden');
  }
}

/**
 * Schreibt eine Datei atomar: erst in eine temporäre Datei (Dotfile, wird
 * nie ausgeliefert), dann per rename an den Zielort.
 */
export async function writeFileAtomic(
  path: string,
  data: Buffer
): Promise<void> {
  const tmp = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(tmp, data, { flag: 'wx' });
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

@Injectable()
export class AvatarStorageService {
  private readonly log = new Logger(AvatarStorageService.name);

  /**
   * Prüft und speichert ein hochgeladenes Bild. Gibt die öffentliche URL zurück.
   * Endung und Dateiname legt ausschließlich der Server fest.
   */
  async store(file: Express.Multer.File | undefined): Promise<string> {
    if (!file?.buffer?.length)
      throw new BadRequestException('Keine Datei hochgeladen');

    const webp = await reencodeAvatar(file.buffer);
    const dir = avatarUploadDir();
    await mkdir(dir, { recursive: true });

    const name = `${randomUUID()}.webp`;
    await writeFileAtomic(join(dir, name), webp);
    return `${AVATAR_URL_PREFIX}${name}`;
  }

  /**
   * Löscht die Datei zu einer Avatar-URL. Fremde URLs (z. B. Google) und
   * Pfade außerhalb des Upload-Verzeichnisses werden ignoriert.
   * Gibt true zurück, wenn eine Datei gelöscht wurde.
   */
  async remove(avatarUrl: string | null | undefined): Promise<boolean> {
    const path = this.filePath(avatarUrl);
    if (!path) return false;
    try {
      await unlink(path);
      return true;
    } catch (err: any) {
      if (err?.code !== 'ENOENT')
        this.log.warn(
          `Avatar konnte nicht gelöscht werden: ${path} (${err?.message})`
        );
      return false;
    }
  }

  /** Pfad zur URL – nur wenn er direkt im Upload-Verzeichnis liegt (Schutz gegen Path Traversal) */
  private filePath(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl?.startsWith(AVATAR_URL_PREFIX)) return null;
    const dir = avatarUploadDir();
    const path = resolve(dir, avatarUrl.slice(AVATAR_URL_PREFIX.length));
    if (dirname(path) !== dir) {
      this.log.warn(
        `Avatar-Pfad außerhalb des Upload-Verzeichnisses abgelehnt: ${avatarUrl}`
      );
      return null;
    }
    return path;
  }
}
