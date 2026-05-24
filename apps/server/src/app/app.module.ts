import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { ParentModule } from './parent/parent.module';
import { ClassModule } from './class/class.module';
import { SubjectModule } from './subject/subject.module';
import { NoteModule } from './note/note.module';
import { AssessmentModule } from './assessment/assessment.module';
import { SeedModule } from './seed/seed.module';
import { TimetableModule } from './timetable/timetable.module';

// Migrations liegen nach dem Build als separate JS-Dateien in dist/apps/server/migrations/.
// __dirname zeigt zur Laufzeit auf dist/apps/server/app/ → eine Ebene hoch.
const migrationsPath = join(__dirname, '..', 'migrations', '*.js');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? ''}`.replace(/\.$/, ''),
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
            synchronize: db.synchronize,
            migrationsRun: db.migrationsRun,
            migrations: [migrationsPath],
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
            synchronize: db.synchronize,
            migrationsRun: db.migrationsRun,
            migrations: [migrationsPath],
            ...(db.ssl && {
              ssl: { rejectUnauthorized: db.sslRejectUnauthorized !== false },
            }),
          };
        }
        // SQLite-Fallback (lokale Entwicklung ohne Docker)
        return {
          type: 'sqlite' as const,
          database: db?.sqlitePath ?? process.env.TYPEORM_DB ?? './klara.sqlite',
          autoLoadEntities: true,
          synchronize: true,
          migrationsRun: db?.migrationsRun,
          migrations: [migrationsPath],
        };
      },
    }),

    AuthModule,
    TeacherModule,
    StudentModule,
    ParentModule,
    ClassModule,
    SubjectModule,
    NoteModule,
    AssessmentModule,
    SeedModule,
    TimetableModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
