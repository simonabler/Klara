import { mkdtempSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { avatarFilePath, deleteAvatarFiles } from './avatar-files';

describe('avatar-files', () => {
  const original = process.env.UPLOAD_DIR;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'klara-avatars-'));
    process.env.UPLOAD_DIR = dir;
  });

  afterEach(() => {
    process.env.UPLOAD_DIR = original;
  });

  it('bildet hochgeladene Avatare auf das Upload-Verzeichnis ab', () => {
    expect(avatarFilePath('/api/uploads/avatars/123-456.png')).toBe(join(dir, '123-456.png'));
  });

  it('ignoriert fremde URLs und leere Werte', () => {
    expect(avatarFilePath('https://lh3.googleusercontent.com/a/xyz')).toBeNull();
    expect(avatarFilePath('')).toBeNull();
    expect(avatarFilePath(null)).toBeNull();
  });

  it('lässt sich nicht aus dem Verzeichnis herausführen', () => {
    expect(avatarFilePath('/api/uploads/avatars/../../etc/passwd')).toBe(join(dir, 'passwd'));
    expect(avatarFilePath('/api/uploads/avatars/..')).toBeNull();
  });

  it('löscht vorhandene Dateien und übergeht fehlende', async () => {
    writeFileSync(join(dir, 'a.png'), 'x');
    await deleteAvatarFiles(['/api/uploads/avatars/a.png', '/api/uploads/avatars/fehlt.png', null]);
    expect(existsSync(join(dir, 'a.png'))).toBe(false);
  });
});
