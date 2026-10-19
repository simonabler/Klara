import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { OAUTH_STATE_COOKIE, OAuthCookieStateStore } from './oauth-state.store';

/** Minimaler Express-Request mit res.cookie/clearCookie */
function makeReq(
  opts: {
    cookies?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
) {
  const res = { cookie: jest.fn(), clearCookie: jest.fn() };
  const req: any = {
    cookies: opts.cookies ?? {},
    query: opts.query ?? {},
    headers: {},
    res,
  };
  return { req, res };
}

describe('OAuthCookieStateStore', () => {
  const store = new OAuthCookieStateStore();

  it('erzeugt pro Login einen zufälligen state und setzt ihn als httpOnly-Cookie', () => {
    const { req, res } = makeReq();
    const cb = jest.fn();
    store.store(req, {}, cb);

    const state = cb.mock.calls[0][1];
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 Byte base64url
    expect(res.cookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      state,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth/google',
      })
    );

    const other = jest.fn();
    store.store(makeReq().req, {}, other);
    expect(other.mock.calls[0][1]).not.toBe(state);
  });

  it('akzeptiert den Callback nur mit passendem state und löscht den Cookie', () => {
    const { req, res } = makeReq({
      cookies: { [OAUTH_STATE_COOKIE]: 'abc123' },
    });
    const cb = jest.fn();
    store.verify(req, 'abc123', {}, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
    expect(res.clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, {
      path: '/api/auth/google',
    });
  });

  it.each([
    ['falscher state', { [OAUTH_STATE_COOKIE]: 'abc123' }, 'xyz789'],
    ['fehlender Cookie (untergeschobener Callback-Link)', {}, 'abc123'],
    ['fehlender state', { [OAUTH_STATE_COOKIE]: 'abc123' }, undefined],
  ])('lehnt ab: %s', (_name, cookies, state) => {
    const { req, res } = makeReq({ cookies });
    const cb = jest.fn();
    store.verify(req, state as any, {}, cb);
    expect(cb).toHaveBeenCalledWith(
      null,
      false,
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(res.clearCookie).toHaveBeenCalled();
  });
});

describe('GoogleStrategy mit state-Schutz', () => {
  const config = {
    get: (key: string) =>
      ({
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_CALLBACK_URL: 'https://klara.example/api/auth/google/callback',
      }[key]),
  } as unknown as ConfigService;

  function strategy() {
    const s: any = new GoogleStrategy(config, {} as any);
    s.redirect = jest.fn();
    s.fail = jest.fn();
    s.error = jest.fn();
    s.success = jest.fn();
    return s;
  }

  it('hängt beim Login-Start den state an die Google-URL und setzt den Cookie', () => {
    const s = strategy();
    const { req, res } = makeReq();
    s.authenticate(req, {});

    const url = new URL(s.redirect.mock.calls[0][0]);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(res.cookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      state,
      expect.any(Object)
    );
  });

  it('bricht den Callback mit falschem state vor dem Token-Tausch ab', () => {
    const s = strategy();
    const tokenExchange = jest.spyOn(s._oauth2, 'getOAuthAccessToken');
    const { req } = makeReq({
      cookies: { [OAUTH_STATE_COOKIE]: 'vom-opfer' },
      query: { code: 'code-des-angreifers', state: 'vom-angreifer' },
    });
    s.authenticate(req, {});

    expect(s.fail).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
      403
    );
    expect(tokenExchange).not.toHaveBeenCalled();
    expect(s.success).not.toHaveBeenCalled();
  });

  it('tauscht den Code nur bei passendem state', () => {
    const s = strategy();
    const tokenExchange = jest
      .spyOn(s._oauth2, 'getOAuthAccessToken')
      .mockImplementation(() => undefined);
    const { req } = makeReq({
      cookies: { [OAUTH_STATE_COOKIE]: 'gleich' },
      query: { code: 'code', state: 'gleich' },
    });
    s.authenticate(req, {});

    expect(s.fail).not.toHaveBeenCalled();
    expect(tokenExchange).toHaveBeenCalled();
  });
});
