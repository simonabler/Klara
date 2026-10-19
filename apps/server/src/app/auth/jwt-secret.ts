import { Logger } from '@nestjs/common';

/** Mindestlänge in Byte – entspricht 256 Bit für HS256 */
export const MIN_JWT_SECRET_BYTES = 32;

/** Bekannte Beispiel- und Standardwerte (u. a. aus .env.example früherer Versionen) */
const KNOWN_DEFAULTS = new Set([
  'change-me-in-production',
  'changeme',
  'change-me',
  'secret',
  'jwt-secret',
  'jwt_secret',
  'your-secret',
  'your_jwt_secret',
  'supersecret',
  'test-secret',
  'password',
]);

const log = new Logger('JwtSecret');

/** Beschreibt, warum ein Secret unsicher ist – oder null, wenn es passt */
export function jwtSecretWeakness(secret: string): string | null {
  const normalized = secret.trim().toLowerCase();
  if (
    KNOWN_DEFAULTS.has(normalized) ||
    /change.?me|example|placeholder/.test(normalized)
  ) {
    return 'bekannter Beispielwert';
  }
  if (Buffer.byteLength(secret, 'utf8') < MIN_JWT_SECRET_BYTES) {
    return `kürzer als ${MIN_JWT_SECRET_BYTES} Byte`;
  }
  if (new Set(secret).size < 10) return 'zu wenige unterschiedliche Zeichen';
  return null;
}

/**
 * Liefert JWT_SECRET zurück oder bricht den Start ab. Mit einem bekannten
 * oder zu kurzen Secret ließen sich gültige Tokens fälschen.
 *
 * In Produktion ist ein schwaches Secret ein Fehler, sonst nur eine Warnung
 * (lokale Entwicklung und Tests).
 */
export function requireJwtSecret(
  secret: string | undefined,
  nodeEnv = process.env.NODE_ENV
): string {
  if (!secret) {
    throw new Error(
      'JWT_SECRET ist nicht gesetzt. Erzeugen mit: openssl rand -base64 48'
    );
  }
  const weakness = jwtSecretWeakness(secret);
  if (weakness) {
    const message = `JWT_SECRET ist unsicher (${weakness}). Neu erzeugen mit: openssl rand -base64 48`;
    if (nodeEnv === 'production') throw new Error(message);
    log.warn(
      `${message} – in Produktion verweigert das Backend damit den Start.`
    );
  }
  return secret;
}
