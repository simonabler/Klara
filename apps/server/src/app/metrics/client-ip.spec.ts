import { getClientIp, isExemptIp, isPrivateIp, normalizeIp } from './client-ip';

describe('client-ip', () => {
  describe('getClientIp', () => {
    it('verwendet req.ip und ignoriert einen vom Client gesetzten X-Forwarded-For', () => {
      const req = { ip: '203.0.113.7', headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.7' } };
      expect(getClientIp(req)).toBe('203.0.113.7');
    });

    it('fällt auf die Socket-Adresse zurück', () => {
      expect(getClientIp({ socket: { remoteAddress: '::ffff:198.51.100.4' } })).toBe('198.51.100.4');
    });

    it('liefert "unknown" ohne Adresse', () => {
      expect(getClientIp({})).toBe('unknown');
    });
  });

  describe('normalizeIp', () => {
    it('entfernt das IPv4-in-IPv6-Präfix', () => {
      expect(normalizeIp('::ffff:10.0.0.5')).toBe('10.0.0.5');
    });

    it('lässt echte IPv6-Adressen unverändert', () => {
      expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    });
  });

  describe('isPrivateIp', () => {
    it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.254', '192.168.1.10', '::1', 'fd12::1', '::ffff:172.18.0.3'])(
      '%s ist privat',
      (ip) => expect(isPrivateIp(ip)).toBe(true),
    );

    it.each(['203.0.113.7', '172.15.0.1', '172.32.0.1', '8.8.8.8', '2001:db8::1', 'unknown'])(
      '%s ist nicht privat',
      (ip) => expect(isPrivateIp(ip)).toBe(false),
    );
  });

  describe('isExemptIp', () => {
    it('nimmt IPs aus der Allowlist aus', () => {
      expect(isExemptIp('203.0.113.7', new Set(['203.0.113.7']))).toBe(true);
      expect(isExemptIp('203.0.113.8', new Set(['203.0.113.7']))).toBe(false);
    });
  });
});
