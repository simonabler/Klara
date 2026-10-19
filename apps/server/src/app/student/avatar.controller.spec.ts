import 'reflect-metadata';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { AssessmentType } from '../assessment/assessment-type.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { Parent } from '../parent/parent.entity';
import { Subject } from '../subject/subject.entity';
import { Teacher } from '../teacher/teacher.entity';
import { AvatarController } from './avatar.controller';
import { Student } from './student.entity';

/** Ersetzt den JWT-Guard: Lehrkraft kommt aus dem Header, ohne Header → 401 */
class HeaderAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const id = req.headers['x-test-teacher'];
    if (!id) throw new UnauthorizedException();
    req.user = { id };
    return true;
  }
}

describe('AvatarController (K-05)', () => {
  const original = process.env.UPLOAD_DIR;
  const fileA = '11111111-2222-4333-8444-555555555555.webp';
  const fileB = '66666666-7777-4888-8999-aaaaaaaaaaaa.webp';
  let app: INestApplication;
  let ds: DataSource;
  let teacherA: Teacher;
  let teacherB: Teacher;

  beforeAll(async () => {
    const root = mkdtempSync(join(tmpdir(), 'klara-avatar-ctrl-'));
    const dir = join(root, 'avatars');
    mkdirSync(dir);
    process.env.UPLOAD_DIR = dir;
    writeFileSync(join(dir, fileA), 'webp-A');
    writeFileSync(join(dir, fileB), 'webp-B');
    writeFileSync(join(root, 'geheim.webp'), 'außerhalb');

    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [
        Teacher,
        Class,
        Student,
        Parent,
        Note,
        Subject,
        AssessmentEvent,
        StudentResult,
        AssessmentType,
      ],
      synchronize: true,
    });
    await ds.initialize();
    const teachers = ds.getRepository(Teacher);
    teacherA = await teachers.save({
      googleId: 'g-a',
      email: 'a@schule.at',
      displayName: 'A',
    });
    teacherB = await teachers.save({
      googleId: 'g-b',
      email: 'b@schule.at',
      displayName: 'B',
    });
    await ds.getRepository(Student).save([
      {
        firstName: 'Anna',
        lastName: 'Muster',
        teacherId: teacherA.id,
        avatarUrl: `/api/uploads/avatars/${fileA}`,
      },
      {
        firstName: 'Ben',
        lastName: 'Huber',
        teacherId: teacherB.id,
        avatarUrl: `/api/uploads/avatars/${fileB}`,
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [AvatarController],
      providers: [
        {
          provide: getRepositoryToken(Student),
          useValue: ds.getRepository(Student),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    process.env.UPLOAD_DIR = original;
    await app?.close();
    await ds?.destroy();
  });

  const get = (path: string, teacher?: Teacher) => {
    const r = request(app.getHttpServer()).get(path);
    return teacher ? r.set('x-test-teacher', teacher.id) : r;
  };

  it('liefert das eigene Bild mit sicheren Headern', async () => {
    const res = await get(`/api/uploads/avatars/${fileA}`, teacherA).expect(
      200
    );
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none'; img-src 'self'; sandbox"
    );
    expect(res.headers['cache-control']).toBe('private, no-cache');
    expect(res.body.toString()).toBe('webp-A');
  });

  it('ohne Anmeldung → 401', async () => {
    await get(`/api/uploads/avatars/${fileA}`).expect(401);
  });

  it('Bild eines Schülers einer anderen Lehrkraft → 404', async () => {
    await get(`/api/uploads/avatars/${fileB}`, teacherA).expect(404);
    await get(`/api/uploads/avatars/${fileA}`, teacherB).expect(404);
  });

  it('Datei ohne zugehörigen Schüler → 404', async () => {
    await get(
      '/api/uploads/avatars/99999999-9999-4999-8999-999999999999.webp',
      teacherA
    ).expect(404);
  });

  it.each([
    'irgendwas.html',
    'bild.png',
    '..%2Fgeheim.webp',
    '..%5Cgeheim.webp',
    '.hidden.webp',
    `${fileA}.html`,
  ])('ungültiger Dateiname %s → 404', async (file) => {
    await get(`/api/uploads/avatars/${file}`, teacherA).expect(404);
  });

  it('der Quarantäne-Ordner ist nicht erreichbar', async () => {
    await get('/api/uploads/quarantine/x.webp', teacherA).expect(404);
  });
});
