import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  // Sicherheitscheck: TYPEORM_SYNC=true in Produktion ist gefährlich
  if (
    process.env.NODE_ENV === 'production' &&
    (process.env.TYPEORM_SYNC === 'true' || process.env.TYPEORM_SYNC === '1')
  ) {
    throw new Error(
      'TYPEORM_SYNC darf in Produktion nicht true sein! ' +
      'Bitte TYPEORM_SYNC=false setzen oder die Variable entfernen.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS: nur explizit erlaubte Origins zulassen
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [frontendUrl].filter(Boolean);
      // Requests ohne Origin (curl, Postman, Server-to-Server) erlauben
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} nicht erlaubt`));
      }
    },
    credentials: true,          // notwendig für Cookie-Auth
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.use(require('cookie-parser')());
  app.set('trust proxy', 1);

  // Helmet zuerst – sonst gehen Antworten der Static-Auslieferung ohne
  // Sicherheits-Header raus
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: { action: 'deny' },
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Upload-Verzeichnis beim Start anlegen + statisch bereitstellen
  const nodePath = require('path');
  const nodeFs   = require('fs');
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads/avatars';
  const absoluteUploadDir = nodePath.resolve(uploadDir);
  nodeFs.mkdirSync(absoluteUploadDir, { recursive: true });
  // Unter /api/uploads/ erreichbar → Traefik leitet alles mit /api zum Backend
  const uploadsRoot = nodePath.resolve(absoluteUploadDir, '..');
  // Nur Bilder im Avatar-Ordner ausliefern – alles andere (z. B. .html oder
  // der Quarantäne-Ordner des Bereinigungsskripts) ergibt 404
  // der Static-Handler dekodiert den Pfad (%2F → /), also auf dem dekodierten Pfad prüfen
  const servableUpload = /^\/avatars\/[^/\\]+\.(webp|png|jpe?g)$/i;
  const decodePath = (path: string) => {
    try {
      return decodeURIComponent(path);
    } catch {
      return '';
    }
  };
  app.use('/api/uploads', (req: Request, res: Response, next: NextFunction) => {
    if (!servableUpload.test(decodePath(req.path))) {
      res.sendStatus(404);
      return;
    }
    next();
  });
  app.useStaticAssets(uploadsRoot, {
    prefix: '/api/uploads',
    dotfiles: 'deny',
    index: false,
    redirect: false,
    setHeaders: (res: Response) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
      res.setHeader('Cache-Control', 'private, max-age=86400');
    },
  });

  const port = process.env.PORT || 3000;

  // Swagger nur außerhalb von Produktion – verhindert Information Disclosure
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Klara API')
      .setDescription('Lehrkraft-Dokumentationstool – REST API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: 'Klara API Docs',
    });

    Logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  Logger.log(`🚀 Klara API: http://localhost:${port}/api`);
}

bootstrap();
