import { ExecutionContext, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MetricsTokenGuard, METRICS_TOKEN_HEADER } from './metrics-token.guard';

const TOKEN = 'a'.repeat(40);

function ctx(headers: Record<string, string> = {}): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ headers }) }) } as unknown as ExecutionContext;
}

describe('MetricsTokenGuard', () => {
  const original = process.env.METRICS_TOKEN;
  let guard: MetricsTokenGuard;

  beforeEach(() => {
    guard = new MetricsTokenGuard();
  });

  afterEach(() => {
    process.env.METRICS_TOKEN = original;
  });

  it('versteckt die Endpunkte (404), wenn kein Token konfiguriert ist', () => {
    delete process.env.METRICS_TOKEN;
    expect(() => guard.canActivate(ctx({ [METRICS_TOKEN_HEADER]: TOKEN }))).toThrow(NotFoundException);
  });

  it('versteckt die Endpunkte (404), wenn das Token zu kurz ist', () => {
    process.env.METRICS_TOKEN = 'kurz';
    expect(() => guard.canActivate(ctx({ [METRICS_TOKEN_HEADER]: 'kurz' }))).toThrow(NotFoundException);
  });

  it('lehnt Requests ohne Token ab', () => {
    process.env.METRICS_TOKEN = TOKEN;
    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
  });

  it('lehnt ein falsches Token ab', () => {
    process.env.METRICS_TOKEN = TOKEN;
    expect(() => guard.canActivate(ctx({ [METRICS_TOKEN_HEADER]: 'b'.repeat(40) }))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx({ [METRICS_TOKEN_HEADER]: TOKEN + 'x' }))).toThrow(UnauthorizedException);
  });

  it('lässt das korrekte Token durch', () => {
    process.env.METRICS_TOKEN = TOKEN;
    expect(guard.canActivate(ctx({ [METRICS_TOKEN_HEADER]: TOKEN }))).toBe(true);
  });
});
