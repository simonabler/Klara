import { isMetricsEnabled } from './metrics-enabled';

describe('isMetricsEnabled', () => {
  it('ist aktiv mit METRICS_ENABLED=true und Postgres', () => {
    expect(isMetricsEnabled({ METRICS_ENABLED: 'true', TYPEORM_HOST: 'db' })).toBe(true);
    expect(isMetricsEnabled({ METRICS_ENABLED: '1', TYPEORM_URL: 'postgres://x' })).toBe(true);
  });

  it('ist ohne explizite Aktivierung aus', () => {
    expect(isMetricsEnabled({ TYPEORM_HOST: 'db' })).toBe(false);
    expect(isMetricsEnabled({ METRICS_ENABLED: 'false', TYPEORM_HOST: 'db' })).toBe(false);
  });

  it('ist mit dem SQLite-Fallback aus', () => {
    expect(isMetricsEnabled({ METRICS_ENABLED: 'true' })).toBe(false);
  });
});

describe('MetricsService beim Start', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MetricsService } = require('./metrics.service');

  it('meldet fehlende Tabellen mit einem Hinweis zur Lösung', async () => {
    const missing = Object.assign(new Error('relation "metric_meta" does not exist'), { driverError: { code: '42P01' } });
    const repo = { findOne: jest.fn().mockRejectedValue(missing), create: jest.fn(), save: jest.fn() };
    const service = new MetricsService(repo, repo, repo);
    await expect(service.onModuleInit()).rejects.toThrow('Migrations ausführen');
  });

  it('reicht andere Fehler unverändert weiter', async () => {
    const other = new Error('Verbindung verweigert');
    const repo = { findOne: jest.fn().mockRejectedValue(other), create: jest.fn(), save: jest.fn() };
    const service = new MetricsService(repo, repo, repo);
    await expect(service.onModuleInit()).rejects.toBe(other);
  });
});
