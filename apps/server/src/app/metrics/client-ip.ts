import { isIP } from 'net';

/**
 * Ermittelt die Client-IP eines Requests.
 *
 * Verwendet bewusst `req.ip` statt den `X-Forwarded-For`-Header selbst zu parsen:
 * Express wertet den Header über `app.set('trust proxy', 1)` (siehe main.ts) nur
 * für den einen vertrauenswürdigen Proxy (Traefik) aus. Den ersten Eintrag des
 * Headers kann dagegen jeder Client frei setzen – damit ließen sich Sperren
 * umgehen oder fremde IPs gezielt sperren.
 */
export function getClientIp(req: any): string {
  const raw: string = req?.ip || req?.socket?.remoteAddress || 'unknown';
  return normalizeIp(raw);
}

/** Entfernt das IPv4-in-IPv6-Präfix (`::ffff:1.2.3.4` → `1.2.3.4`) */
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.startsWith('::ffff:') && isIP(trimmed.slice(7)) === 4 ? trimmed.slice(7) : trimmed;
}

/**
 * Loopback- und private Adressen (RFC 1918, Unique Local IPv6).
 *
 * Hinter Traefik kommt öffentlicher Traffic immer mit der echten Client-IP an.
 * Private Adressen stammen daher von internen Diensten – vor allem vom
 * SSR-Frontend-Container, über den die Server-Requests *aller* Nutzer laufen.
 * Würden diese gezählt, würde der Anomaly-Guard das eigene Frontend sperren.
 */
export function isPrivateIp(ip: string): boolean {
  const addr = normalizeIp(ip);
  const v = isIP(addr);
  if (v === 4) {
    const [a, b] = addr.split('.').map(Number);
    return (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (v === 6) {
    const lower = addr.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd');
  }
  return false;
}

/** Zusätzlich ausgenommene IPs aus `ANOMALY_ALLOWLIST` (kommagetrennt) */
export function allowlistFromEnv(): Set<string> {
  return new Set(
    (process.env.ANOMALY_ALLOWLIST ?? '')
      .split(',')
      .map((s) => normalizeIp(s))
      .filter(Boolean),
  );
}

/** Wird diese IP weder gezählt noch gesperrt? */
export function isExemptIp(ip: string, allowlist: Set<string> = allowlistFromEnv()): boolean {
  return isPrivateIp(ip) || allowlist.has(normalizeIp(ip));
}
