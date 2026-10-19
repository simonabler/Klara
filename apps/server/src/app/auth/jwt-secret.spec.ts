import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { jwtSecretWeakness, requireJwtSecret } from './jwt-secret';

describe('requireJwtSecret', () => {
  const strong = randomBytes(48).toString('base64');

  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  );
  afterEach(() => jest.restoreAllMocks());

  it('akzeptiert ein zufälliges Secret mit 48 Byte', () => {
    expect(jwtSecretWeakness(strong)).toBeNull();
    expect(requireJwtSecret(strong, 'production')).toBe(strong);
  });

  it.each([
    ['change-me-in-production'],
    ['CHANGEME'],
    ['bitte-change-me-vor-dem-livegang-1234567890'],
    ['example-secret-example-secret-example-secret'],
    ['secret'],
  ])('lehnt den Beispielwert "%s" in Produktion ab', (secret) => {
    expect(() => requireJwtSecret(secret, 'production')).toThrow(
      /JWT_SECRET ist unsicher/
    );
  });

  it('lehnt zu kurze Secrets in Produktion ab', () => {
    const short = randomBytes(16).toString('hex').slice(0, 31); // 31 Byte
    expect(jwtSecretWeakness(short)).toMatch(/kürzer als 32 Byte/);
    expect(() => requireJwtSecret(short, 'production')).toThrow(
      /kürzer als 32 Byte/
    );
  });

  it('lehnt lange Secrets aus wenigen Zeichen ab', () => {
    expect(jwtSecretWeakness('a'.repeat(64))).toMatch(
      /unterschiedliche Zeichen/
    );
  });

  it('verweigert den Start ohne Secret – auch außerhalb von Produktion', () => {
    expect(() => requireJwtSecret(undefined, 'development')).toThrow(
      /nicht gesetzt/
    );
    expect(() => requireJwtSecret('', 'production')).toThrow(/nicht gesetzt/);
  });

  it('warnt in der Entwicklung nur und startet trotzdem', () => {
    expect(requireJwtSecret('change-me-in-production', 'development')).toBe(
      'change-me-in-production'
    );
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET ist unsicher')
    );
  });
});
