import { randomBytes, timingSafeEqual } from 'crypto';
import { Request } from 'express';

export const OAUTH_STATE_COOKIE = 'klara_oauth_state';
/** Gilt für /api/auth/google und /api/auth/google/callback */
const COOKIE_PATH = '/api/auth/google';
const MAX_AGE_MS = 10 * 60 * 1000; // 10 Minuten für den Login bei Google

type StoreCallback = (err: Error | null, state?: string) => void;
type VerifyCallback = (
  err: Error | null,
  ok: boolean,
  info?: { message: string }
) => void;

/**
 * OAuth-`state` gegen Login-CSRF ohne Server-Session: Pro Login-Vorgang wird
 * ein zufälliger Wert erzeugt, an Google übergeben und zusätzlich als
 * httpOnly-Cookie gesetzt. Im Callback müssen beide übereinstimmen.
 *
 * `sameSite: 'lax'` reicht, weil Google per Top-Level-GET zurückleitet.
 * Ein Angreifer kann den Cookie im Browser des Opfers nicht setzen, ein
 * untergeschobener Callback-Link scheitert daher an der Prüfung.
 */
export class OAuthCookieStateStore {
  store(req: Request, _meta: unknown, callback: StoreCallback): void {
    const state = randomBytes(32).toString('base64url');
    req.res?.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: MAX_AGE_MS,
    });
    callback(null, state);
  }

  verify(
    req: Request,
    state: string,
    _meta: unknown,
    callback: VerifyCallback
  ): void {
    const expected: unknown = req.cookies?.[OAUTH_STATE_COOKIE];
    // Einmalig verwendbar – unabhängig vom Ergebnis entfernen
    req.res?.clearCookie(OAUTH_STATE_COOKIE, { path: COOKIE_PATH });

    if (
      typeof expected !== 'string' ||
      typeof state !== 'string' ||
      !safeEqual(expected, state)
    ) {
      callback(null, false, {
        message: 'Ungültiger oder abgelaufener OAuth-State',
      });
      return;
    }
    callback(null, true);
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
