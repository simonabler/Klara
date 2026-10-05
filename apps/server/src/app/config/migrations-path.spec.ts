import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { resolveMigrationsGlob } from './migrations-path';

describe('resolveMigrationsGlob', () => {
  let base: string;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'klara-dist-'));
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('zeigt auf migrations/ direkt neben main.js (nicht eine Ebene höher)', () => {
    expect(resolveMigrationsGlob(base, {})).toBe(join(base, 'migrations', '*.js'));
  });

  it('warnt, wenn Migrations laufen sollen, aber keine da sind', () => {
    resolveMigrationsGlob(base, { TYPEORM_MIGRATIONS_RUN: 'true' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('keine Migrations'));
  });

  it('warnt nicht, wenn Migrations vorhanden sind', () => {
    mkdirSync(join(base, 'migrations'));
    writeFileSync(join(base, 'migrations', '1-Init.js'), '');
    resolveMigrationsGlob(base, { TYPEORM_MIGRATIONS_RUN: 'true' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warnt nicht, wenn Migrations gar nicht laufen sollen', () => {
    resolveMigrationsGlob(base, {});
    expect(warn).not.toHaveBeenCalled();
  });
});
