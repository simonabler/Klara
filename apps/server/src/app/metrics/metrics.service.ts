import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricMetaEntity } from './entities/metric-meta.entity';
import { MetricRouteEntity } from './entities/metric-route.entity';
import { MetricDailyEntity } from './entities/metric-daily.entity';

export interface RouteStats {
  route: string;
  count: number;
  methods: Record<string, number>;
  statuses: Record<string, number>;
  sumMs: number;
  minMs: number;
  maxMs: number;
  lastCallIso?: string;
}

export interface MetricsSnapshot {
  startedAtIso: string;
  totalCount: number;
  byRoute: (RouteStats & { avgMs: number })[];
  daily: Record<string, number>;
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly log = new Logger(MetricsService.name);
  private metaCache: MetricMetaEntity | null = null;

  constructor(
    @InjectRepository(MetricMetaEntity)
    private readonly metaRepo: Repository<MetricMetaEntity>,
    @InjectRepository(MetricRouteEntity)
    private readonly routeRepo: Repository<MetricRouteEntity>,
    @InjectRepository(MetricDailyEntity)
    private readonly dailyRepo: Repository<MetricDailyEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureMeta();
    } catch (err: any) {
      // 42P01 = Tabelle fehlt: verständlich melden statt nacktem QueryFailedError
      if (err?.driverError?.code === '42P01' || err?.code === '42P01') {
        throw new Error(
          'Die Tabellen des Metrics-Moduls fehlen (metric_meta). Migrations ausführen ' +
          '(„npm run migration:run“ oder TYPEORM_MIGRATIONS_RUN=true) oder METRICS_ENABLED=false setzen.',
        );
      }
      throw err;
    }
  }

  /**
   * Zählt einen Request.
   *
   * Alle Zähler werden atomar in der Datenbank erhöht (UPDATE … + 1 bzw.
   * INSERT … ON CONFLICT DO UPDATE). Ein Lesen-Ändern-Schreiben im Speicher
   * würde bei parallelen Requests Updates verlieren und beim ersten Aufruf
   * einer Route doppelte Inserts erzeugen. Postgres-spezifisch – das Modul
   * ist nur mit Postgres aktiv (siehe metrics-enabled.ts).
   */
  async record(route: string, method: string, status: number, durationMs: number): Promise<void> {
    const normalizedRoute = route || 'unknown';
    const dayKey = new Date().toISOString().slice(0, 10);

    await this.ensureMeta();

    await Promise.all([
      this.metaRepo
        .query(
          `UPDATE "metric_meta" SET "totalCount" = "totalCount" + 1, "updatedAt" = now() WHERE "id" = 'global'`,
        )
        .catch((err) => this.logError('metric meta', err)),

      this.routeRepo
        .query(
          `INSERT INTO "metric_route"
             ("route", "count", "methods", "statuses", "sumMs", "minMs", "maxMs", "lastCallAt")
           VALUES ($1, 1, jsonb_build_object($2::text, 1), jsonb_build_object($3::text, 1), $4, $4, $4, now())
           ON CONFLICT ("route") DO UPDATE SET
             "count"      = "metric_route"."count" + 1,
             "methods"    = "metric_route"."methods"
                            || jsonb_build_object($2::text, COALESCE(("metric_route"."methods" ->> $2::text)::int, 0) + 1),
             "statuses"   = "metric_route"."statuses"
                            || jsonb_build_object($3::text, COALESCE(("metric_route"."statuses" ->> $3::text)::int, 0) + 1),
             "sumMs"      = "metric_route"."sumMs" + EXCLUDED."sumMs",
             "minMs"      = LEAST("metric_route"."minMs", EXCLUDED."minMs"),
             "maxMs"      = GREATEST("metric_route"."maxMs", EXCLUDED."maxMs"),
             "lastCallAt" = now(),
             "updatedAt"  = now()`,
          [normalizedRoute, method, String(status), durationMs],
        )
        .catch((err) => this.logError(`route metric for ${normalizedRoute}`, err)),

      this.dailyRepo
        .query(
          `INSERT INTO "metric_daily" ("day", "count") VALUES ($1, 1)
           ON CONFLICT ("day") DO UPDATE SET "count" = "metric_daily"."count" + 1, "updatedAt" = now()`,
          [dayKey],
        )
        .catch((err) => this.logError(`daily metric for ${dayKey}`, err)),
    ]);
  }

  private logError(what: string, err: unknown): void {
    this.log.error(`Failed to persist ${what}`, err instanceof Error ? err.stack : String(err));
  }

  async snapshot(): Promise<MetricsSnapshot> {
    await this.ensureMeta();
    // Frisch lesen: totalCount wird atomar in der DB erhöht, der Cache kennt den Stand nicht
    const [meta, routes, dailyRows] = await Promise.all([
      this.metaRepo.findOneOrFail({ where: { id: 'global' } }),
      this.routeRepo.find(),
      this.dailyRepo.find(),
    ]);

    const byRoute = routes.map<RouteStats & { avgMs: number }>((entry) => {
      const count = entry.count || 0;
      const sumMs = entry.sumMs ?? 0;
      const avgMs = count ? Math.round((sumMs / count) * 100) / 100 : 0;
      return {
        route: entry.route,
        count,
        methods: entry.methods ?? {},
        statuses: entry.statuses ?? {},
        sumMs,
        minMs: entry.minMs ?? 0,
        maxMs: entry.maxMs ?? 0,
        lastCallIso: entry.lastCallAt ? entry.lastCallAt.toISOString() : undefined,
        avgMs,
      };
    });

    const daily: Record<string, number> = {};
    for (const row of dailyRows) {
      daily[String(row.day)] = row.count;
    }

    return {
      startedAtIso: meta.startedAt.toISOString(),
      totalCount: meta.totalCount ?? 0,
      byRoute,
      daily,
    };
  }

  async reset(): Promise<void> {
    const meta = await this.ensureMeta();
    meta.totalCount = 0;
    meta.startedAt = new Date();
    const savedMeta = await this.metaRepo.save(meta);
    this.metaCache = savedMeta;
    await this.routeRepo.clear();
    await this.dailyRepo.clear();
  }

  private async ensureMeta(): Promise<MetricMetaEntity> {
    if (this.metaCache) {
      return this.metaCache;
    }
    let meta = await this.metaRepo.findOne({ where: { id: 'global' } });
    if (!meta) {
      meta = this.metaRepo.create({ id: 'global', startedAt: new Date(), totalCount: 0 });
      meta = await this.metaRepo.save(meta);
    }
    this.metaCache = meta;
    return meta;
  }
}
