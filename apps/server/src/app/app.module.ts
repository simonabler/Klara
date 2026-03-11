import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { TeacherModule } from './teacher/teacher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? ''}`.replace(/\.$/, ''),
        '.env.local',
        '.env',
      ],
      load: [appConfig],
    }),
    ConfigModule.forFeature(databaseConfig),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const db = cfg.get<any>('database');
        if (db?.url) {
          return {
            type: 'postgres' as const,
            url: db.url,
            autoLoadEntities: true,
            synchronize: db.synchronize !== false,
            ...(db.ssl && {
              ssl: { rejectUnauthorized: db.sslRejectUnauthorized !== false },
            }),
          };
        }
        if (db?.host) {
          return {
            type: 'postgres' as const,
            host: db.host,
            port: db.port ?? 5432,
            username: db.username ?? undefined,
            password: db.password ?? undefined,
            database: db.database ?? undefined,
            autoLoadEntities: true,
            synchronize: db.synchronize !== false,
            ...(db.ssl && {
              ssl: { rejectUnauthorized: db.sslRejectUnauthorized !== false },
            }),
          };
        }
        return {
          type: 'sqlite' as const,
          database: db?.sqlitePath ?? process.env.TYPEORM_DB ?? './klara.sqlite',
          autoLoadEntities: true,
          synchronize: db?.synchronize !== false,
        };
      },
    }),

    AuthModule,
    TeacherModule,

    // Weitere Feature-Module ab Issue 3:
    // StudentModule, ClassModule, SubjectModule, ...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
