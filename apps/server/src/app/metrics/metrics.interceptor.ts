import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import { Reflector } from '@nestjs/core';
import { SKIP_METRICS } from './metrics.decorator';
import { AnomalyDetectorService } from './anomaly-detector.service';

function resolveRoutePath(req: any): string {
  const expressRoute =
    req?.route?.path ||
    (req as any)?.routerPath ||
    req?.originalUrl?.split('?')[0] ||
    req?.url?.split('?')[0];

  const fastifyRoute =
    (req as any)?.raw?.routeOptions?.url ||
    (req as any)?.raw?.originalUrl?.split('?')[0];

  return expressRoute || fastifyRoute || 'unknown';
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly log = new Logger(MetricsInterceptor.name);

  constructor(
    private readonly metrics: MetricsService,
    private readonly reflector: Reflector,
    private readonly anomaly: AnomalyDetectorService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip =
      this.reflector.get<boolean>(SKIP_METRICS, context.getHandler()) ||
      this.reflector.get<boolean>(SKIP_METRICS, context.getClass());

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest();
    const res = httpCtx.getResponse();
    const method = (req?.method || 'GET').toUpperCase();
    const path = resolveRoutePath(req);

    const start = typeof process.hrtime.bigint === 'function'
      ? process.hrtime.bigint()
      : BigInt(Date.now());

    // Bei Exceptions setzt erst der Exception-Filter (nach finalize) den Statuscode –
    // res.statusCode stünde hier noch auf 200. Daher Status aus dem Fehler ableiten.
    let errorStatus: number | undefined;

    return next.handle().pipe(
      tap({
        error: (err: unknown) => {
          errorStatus = err instanceof HttpException ? err.getStatus() : 500;
        },
      }),
      finalize(() => {
        const end = typeof process.hrtime.bigint === 'function'
          ? process.hrtime.bigint()
          : BigInt(Date.now());
        const durationMs = Number(end - start) / 1_000_000;
        const status = errorStatus ?? res?.statusCode ?? 0;

        if (!skip) {
          this.metrics.record(path, method, status, durationMs).catch((err) => {
            this.log.error('Failed to store request metric', err instanceof Error ? err.stack : String(err));
          });
        }
        this.anomaly.observe(req, path, method, status);
      }),
    );
  }
}
