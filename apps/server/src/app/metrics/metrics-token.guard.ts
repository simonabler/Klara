import { CanActivate, ExecutionContext, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/** Header, in dem das Token für die `_stats`-Endpunkte mitgeschickt wird */
export const METRICS_TOKEN_HEADER = 'x-metrics-token';

/** Mindestlänge, damit ein schwaches Token die Endpunkte nicht öffnet */
export const METRICS_TOKEN_MIN_LENGTH = 32;

/**
 * Schützt die `_stats`-Endpunkte mit einem statischen Token aus `METRICS_TOKEN`.
 *
 * - Kein oder zu kurzes Token konfiguriert → 404 (Endpunkte gelten als nicht vorhanden)
 * - Falsches oder fehlendes Token im Request → 401
 */
@Injectable()
export class MetricsTokenGuard implements CanActivate {
  private readonly log = new Logger(MetricsTokenGuard.name);
  private warned = false;

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.METRICS_TOKEN ?? '';
    if (expected.length < METRICS_TOKEN_MIN_LENGTH) {
      if (!this.warned) {
        this.log.warn(`METRICS_TOKEN fehlt oder ist kürzer als ${METRICS_TOKEN_MIN_LENGTH} Zeichen – _stats-Endpunkte sind deaktiviert`);
        this.warned = true;
      }
      throw new NotFoundException();
    }

    const req = context.switchToHttp().getRequest();
    const provided = req?.headers?.[METRICS_TOKEN_HEADER];
    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

/** Zeitkonstanter Vergleich, damit die Antwortzeit das Token nicht verrät */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
