import { BadRequestException } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import {
  AvatarStorageService,
  MAX_INPUT_PIXELS,
} from './avatar-storage.service';

function image(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 80, b: 40 },
    },
  });
}

function upload(
  buffer: Buffer,
  originalname = 'bild.png',
  mimetype = 'image/png'
) {
  return {
    buffer,
    originalname,
    mimetype,
    size: buffer.length,
  } as Express.Multer.File;
}

describe('AvatarStorageService', () => {
  const original = process.env.UPLOAD_DIR;
  let root: string;
  let dir: string;
  let service: AvatarStorageService;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'klara-avatar-storage-'));
    dir = join(root, 'avatars');
    mkdirSync(dir);
    process.env.UPLOAD_DIR = dir;
    service = new AvatarStorageService();
  });

  afterEach(() => {
    process.env.UPLOAD_DIR = original;
  });

  describe('store', () => {
    it('speichert ein gültiges PNG als <uuid>.webp', async () => {
      const png = await image(800, 600).png().toBuffer();
      const url = await service.store(upload(png));

      expect(url).toMatch(/^\/api\/uploads\/avatars\/[0-9a-f-]{36}\.webp$/);
      const file = join(dir, url.split('/').pop()!);
      const meta = await sharp(readFileSync(file)).metadata();
      expect(meta.format).toBe('webp');
      // auf max. 512×512 zugeschnitten
      expect(meta.width).toBe(512);
      expect(meta.height).toBe(512);
      // keine temporären Dateien übrig
      expect(readdirSync(dir)).toEqual([url.split('/').pop()]);
    });

    it('entfernt EXIF-Daten', async () => {
      const jpeg = await image(300, 300)
        .jpeg()
        .withExif({
          IFD0: { Copyright: 'Klara Test', ImageDescription: 'GPS-Test' },
        })
        .toBuffer();
      expect((await sharp(jpeg).metadata()).exif).toBeDefined();

      const url = await service.store(upload(jpeg, 'foto.jpg', 'image/jpeg'));
      const meta = await sharp(
        readFileSync(join(dir, url.split('/').pop()!))
      ).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
    });

    it('ignoriert eine gefälschte Endung im Dateinamen', async () => {
      const png = await image(64, 64).png().toBuffer();
      const url = await service.store(upload(png, 'evil.html', 'image/png'));
      expect(url.endsWith('.webp')).toBe(true);
      expect(url).not.toContain('evil');
    });

    it.each([
      ['HTML', '<html><script>fetch("/api/auth/export")</script></html>'],
      [
        'SVG',
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>',
      ],
      ['Text', 'nur ein bisschen Text'],
    ])(
      'lehnt %s mit gefälschtem MIME-Typ image/png ab und schreibt nichts',
      async (_name, content) => {
        const fake = upload(Buffer.from(content), 'avatar.png', 'image/png');
        await expect(service.store(fake)).rejects.toThrow(BadRequestException);
        expect(readdirSync(dir)).toEqual([]);
      }
    );

    it('lehnt andere Bildformate ab (z. B. GIF)', async () => {
      const gif = await image(16, 16).gif().toBuffer();
      await expect(
        service.store(upload(gif, 'a.png', 'image/png'))
      ).rejects.toThrow('Nur JPEG, PNG und WebP sind erlaubt');
      expect(readdirSync(dir)).toEqual([]);
    });

    it('lehnt zu große Bilder (Decompression-Bombe) ab', async () => {
      // 8000 × 6000 = 48 MP, als einfarbiges PNG aber nur wenige KB groß
      const bomb = await image(8000, 6000)
        .png({ compressionLevel: 9 })
        .toBuffer();
      expect(8000 * 6000).toBeGreaterThan(MAX_INPUT_PIXELS);
      await expect(service.store(upload(bomb))).rejects.toThrow(
        BadRequestException
      );
      expect(readdirSync(dir)).toEqual([]);
    });

    it('lehnt fehlende oder leere Dateien ab', async () => {
      await expect(service.store(undefined)).rejects.toThrow(
        'Keine Datei hochgeladen'
      );
      await expect(service.store(upload(Buffer.alloc(0)))).rejects.toThrow(
        'Keine Datei hochgeladen'
      );
    });
  });

  describe('remove', () => {
    it('löscht die alte Datei', async () => {
      const png = await image(64, 64).png().toBuffer();
      const oldUrl = await service.store(upload(png));
      const newUrl = await service.store(upload(png));

      expect(await service.remove(oldUrl)).toBe(true);
      expect(readdirSync(dir)).toEqual([newUrl.split('/').pop()]);
    });

    it('übergeht fehlende Dateien und fremde URLs', async () => {
      expect(await service.remove('/api/uploads/avatars/fehlt.webp')).toBe(
        false
      );
      expect(
        await service.remove('https://lh3.googleusercontent.com/a/xyz')
      ).toBe(false);
      expect(await service.remove(null)).toBe(false);
    });

    it('lässt sich nicht aus dem Upload-Verzeichnis herausführen', async () => {
      const outside = join(root, 'geheim.txt');
      writeFileSync(outside, 'x');
      mkdirSync(join(root, 'quarantine'));
      writeFileSync(join(root, 'quarantine', 'q.png'), 'x');

      expect(await service.remove('/api/uploads/avatars/../geheim.txt')).toBe(
        false
      );
      expect(await service.remove('/api/uploads/avatars/..%2Fgeheim.txt')).toBe(
        false
      );
      expect(
        await service.remove('/api/uploads/avatars/../quarantine/q.png')
      ).toBe(false);
      expect(
        await service.remove('/api/uploads/avatars/sub/../../geheim.txt')
      ).toBe(false);
      expect(await service.remove('/api/uploads/avatars/')).toBe(false);
      expect(existsSync(outside)).toBe(true);
      expect(existsSync(join(root, 'quarantine', 'q.png'))).toBe(true);
    });
  });
});
