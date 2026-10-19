import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { CSP_NONCE } from '@angular/core';
import { CommonEngine } from '@angular/ssr/node';
import * as express from 'express';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import bootstrap from './main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/apps/klara/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? join(distFolder, 'index.original.html')
    : join(distFolder, 'index.html');

  // Schutz gegen SSRF/Host-Header-Injection (@angular/ssr ab 20.3): nur bekannte Hosts
  // werden serverseitig gerendert, alle anderen bekommen die CSR-Variante.
  // Produktion: NG_ALLOWED_HOSTS=klara.abler.tirol (kommagetrennt) – ersetzt diese Liste.
  const commonEngine = new CommonEngine({
    allowedHosts: ['localhost'],
  });

  server.set('view engine', 'html');
  server.set('views', distFolder);
  server.disable('x-powered-by');

  // Content-Security-Policy mit Nonce pro Request: Inline-Skripte laufen nur mit
  // dieser Nonce, Inline-Event-Handler gar nicht. Vorerst nur melden
  // (Report-Only, Meldungen in der Browser-Konsole); scharf mit CSP_REPORT_ONLY=false.
  server.use((_req, res, next) => {
    res.locals['cspNonce'] = randomBytes(16).toString('base64');
    next();
  });
  server.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        reportOnly: process.env['CSP_REPORT_ONLY'] !== 'false',
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            (_req, res) =>
              `'nonce-${(res as express.Response).locals['cspNonce']}'`,
          ],
          scriptSrcAttr: ["'none'"],
          // Angular setzt Inline-Styles und style-Attribute – Style-Injection ist
          // weit weniger gefährlich als Script-Injection
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get(
    '*.*',
    express.static(distFolder, {
      maxAge: '1y',
    })
  );

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: distFolder,
        // Critical-CSS-Inlining setzt onload="this.media='all'" – ein Inline-Handler,
        // den die CSP (script-src-attr 'none') blockiert
        inlineCriticalCss: false,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          // Angular versieht eigene Inline-Skripte/-Styles mit dieser Nonce
          { provide: CSP_NONCE, useValue: res.locals['cspNonce'] },
        ],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;
