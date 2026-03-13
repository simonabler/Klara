import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
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

  app.enableCors();
  app.use(cookieParser());
  app.set('trust proxy', 1);

  // Upload-Verzeichnis beim Start anlegen + statisch bereitstellen
  const nodePath = require('path');
  const nodeFs   = require('fs');
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads/avatars';
  const absoluteUploadDir = nodePath.resolve(uploadDir);
  nodeFs.mkdirSync(absoluteUploadDir, { recursive: true });
  // Unter /api/uploads/ erreichbar → Traefik leitet alles mit /api zum Backend
  const uploadsRoot = nodePath.resolve(absoluteUploadDir, '..');
  app.useStaticAssets(uploadsRoot, { prefix: '/api/uploads' });

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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Klara API: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
