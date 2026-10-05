import { CallHandler, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';

function setup() {
  const metrics = { record: jest.fn().mockResolvedValue(undefined) };
  const anomaly = { observe: jest.fn() };
  const interceptor = new MetricsInterceptor(metrics as any, new Reflector(), anomaly as any);
  const req = { method: 'GET', route: { path: '/api/students/:id' }, ip: '203.0.113.7' };
  const res = { statusCode: 200 };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
  return { interceptor, metrics, anomaly, ctx };
}

describe('MetricsInterceptor', () => {
  it('zählt erfolgreiche Requests mit dem Response-Status', async () => {
    const { interceptor, metrics, anomaly, ctx } = setup();
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(metrics.record).toHaveBeenCalledWith('/api/students/:id', 'GET', 200, expect.any(Number));
    expect(anomaly.observe).toHaveBeenCalledWith(expect.anything(), '/api/students/:id', 'GET', 200);
  });

  it('zählt HttpExceptions mit ihrem echten Status statt 200', async () => {
    const { interceptor, metrics, anomaly, ctx } = setup();
    const next: CallHandler = { handle: () => throwError(() => new NotFoundException()) };

    await expect(lastValueFrom(interceptor.intercept(ctx, next))).rejects.toThrow(NotFoundException);

    expect(metrics.record).toHaveBeenCalledWith('/api/students/:id', 'GET', 404, expect.any(Number));
    expect(anomaly.observe).toHaveBeenCalledWith(expect.anything(), '/api/students/:id', 'GET', 404);
  });

  it('zählt unerwartete Fehler als 500', async () => {
    const { interceptor, metrics, ctx } = setup();
    const next: CallHandler = { handle: () => throwError(() => new Error('kaputt')) };

    await expect(lastValueFrom(interceptor.intercept(ctx, next))).rejects.toThrow('kaputt');

    expect(metrics.record).toHaveBeenCalledWith('/api/students/:id', 'GET', 500, expect.any(Number));
  });
});
