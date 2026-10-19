import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AnomalyGuard } from './anomaly.guard';
import { BlocklistService } from './blocklist.service';

function makeBlocklist() {
  const repo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((o: any) => o),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  return new BlocklistService(repo as any);
}

function ctx(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

/** Simuliert n Requests einer IP innerhalb weniger Millisekunden */
function burst(detector: AnomalyDetectorService, req: any, n: number) {
  for (let i = 0; i < n; i++) detector.observe(req, '/api/students', 'GET', 200);
}

describe('Anomaly-Erkennung', () => {
  let blocklist: BlocklistService;
  let detector: AnomalyDetectorService;
  let guard: AnomalyGuard;

  beforeEach(() => {
    blocklist = makeBlocklist();
    detector = new AnomalyDetectorService(blocklist);
    guard = new AnomalyGuard(blocklist, new Reflector());
  });

  it('sperrt eine öffentliche IP bei zu vielen Requests pro Minute', () => {
    const req = { ip: '203.0.113.7' };
    burst(detector, req, 121);

    expect(blocklist.isBlocked('203.0.113.7').blocked).toBe(true);
    expect(() => guard.canActivate(ctx(req))).toThrow(HttpException);
    try {
      guard.canActivate(ctx(req));
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('zählt den SSR-Container (private IP) nicht – das Frontend sperrt sich nicht selbst', () => {
    const ssr = { ip: '172.18.0.4' };
    burst(detector, ssr, 500);

    expect(blocklist.isBlocked('172.18.0.4').blocked).toBe(false);
    expect(guard.canActivate(ctx(ssr))).toBe(true);
  });

  it('lässt sich nicht über einen gefälschten X-Forwarded-For austricksen', () => {
    // Angreifer rotiert den Header, die echte IP (req.ip) bleibt gleich
    for (let i = 0; i < 121; i++) {
      detector.observe({ ip: '203.0.113.9', headers: { 'x-forwarded-for': `10.0.0.${i}` } }, '/api/notes', 'GET', 200);
    }
    expect(blocklist.isBlocked('203.0.113.9').blocked).toBe(true);
    // und kann keine fremde IP sperren lassen
    expect(blocklist.isBlocked('10.0.0.1').blocked).toBe(false);
  });

  it('bleibt unter dem Schwellwert unauffällig', () => {
    burst(detector, { ip: '198.51.100.20' }, 100);
    expect(blocklist.isBlocked('198.51.100.20').blocked).toBe(false);
  });
});
