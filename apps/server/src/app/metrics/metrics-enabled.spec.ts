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
