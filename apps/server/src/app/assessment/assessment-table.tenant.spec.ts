import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AssessmentService } from './assessment.service';
import { AssessmentEvent } from './assessment-event.entity';
import { AssessmentType } from './assessment-type.entity';
import { StudentResult } from './student-result.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { Parent } from '../parent/parent.entity';
import { Student } from '../student/student.entity';
import { Subject } from '../subject/subject.entity';
import { Teacher } from '../teacher/teacher.entity';

/**
 * Mandantentrennung der Tabellenansicht mit echter Datenbank (SQLite in-memory):
 * zwei Lehrkräfte mit je einer Klasse. Security-Review 19.10.2026, Punkt 3.
 */
describe('AssessmentService.getTable – Mandantentrennung', () => {
  let ds: DataSource;
  let service: AssessmentService;
  let eventRepo: ReturnType<DataSource['getRepository']>;
  let teacherA: Teacher;
  let teacherB: Teacher;
  let classA: Class;
  let classB: Class;
  let studentA: Student;

  beforeAll(async () => {
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
      displayName: 'Lehrkraft A',
    });
    teacherB = await teachers.save({
      googleId: 'g-b',
      email: 'b@schule.at',
      displayName: 'Lehrkraft B',
    });

    const students = ds.getRepository(Student);
    studentA = await students.save({
      firstName: 'Anna',
      lastName: 'Muster',
      avatarUrl: '/api/uploads/avatars/anna.webp',
      teacherId: teacherA.id,
    });
    const studentB = await students.save({
      firstName: 'Ben',
      lastName: 'Huber',
      teacherId: teacherB.id,
    });

    const classes = ds.getRepository(Class);
    classA = await classes.save({
      name: '3A',
      schoolYear: '2026/27',
      teacherId: teacherA.id,
      students: [studentA],
    });
    classB = await classes.save({
      name: '4B',
      schoolYear: '2026/27',
      teacherId: teacherB.id,
      students: [studentB],
    });

    const subjects = ds.getRepository(Subject);
    const subjectA = await subjects.save({
      name: 'Deutsch',
      teacherId: teacherA.id,
    });

    const notes = ds.getRepository(Note);
    await notes.save([
      // eigene Notizen von A
      {
        content: 'A1',
        teacherId: teacherA.id,
        studentId: studentA.id,
        classId: classA.id,
        subjectId: subjectA.id,
      },
      {
        content: 'A2',
        teacherId: teacherA.id,
        studentId: studentA.id,
        classId: classA.id,
      },
      // Notiz von B mit fremder classId/studentId – darf bei A nicht mitgezählt werden
      {
        content: 'B1',
        teacherId: teacherB.id,
        studentId: studentA.id,
        classId: classA.id,
      },
    ]);

    eventRepo = ds.getRepository(AssessmentEvent);
    service = new AssessmentService(
      ds.getRepository(AssessmentEvent),
      ds.getRepository(StudentResult),
      ds.getRepository(Class),
      ds.getRepository(Note),
      ds.getRepository(AssessmentType)
    );
  });

  afterAll(() => ds?.destroy());

  afterEach(() => jest.restoreAllMocks());

  it('Lehrkraft B erhält für die Klasse von Lehrkraft A 404 ohne Schülerdaten', async () => {
    const findEvents = jest.spyOn(eventRepo, 'find');

    const err = await service.getTable(teacherB.id, classA.id).catch((e) => e);

    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.getStatus()).toBe(404);
    expect(err.message).toBe('Klasse nicht gefunden');
    expect(JSON.stringify(err.getResponse())).not.toMatch(
      /Anna|Muster|anna\.webp/
    );
    // Prüfung kommt vor allem anderen – es werden keine Events geladen
    expect(findEvents).not.toHaveBeenCalled();
  });

  it('liefert 404 für eine unbekannte Klasse', async () => {
    await expect(
      service.getTable(teacherA.id, '00000000-0000-4000-8000-000000000000')
    ).rejects.toThrow(NotFoundException);
  });

  it('noteCount zählt nur Notizen der eingeloggten Lehrkraft', async () => {
    const table = await service.getTable(teacherA.id, classA.id);

    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]).toMatchObject({
      studentId: studentA.id,
      firstName: 'Anna',
      noteCount: 2,
    });
  });

  it('filtert die Notizen weiterhin nach Fach', async () => {
    const [subjectA] = await ds
      .getRepository(Subject)
      .find({ where: { teacherId: teacherA.id } });
    const table = await service.getTable(teacherA.id, classA.id, subjectA.id);
    expect(table.rows[0].noteCount).toBe(1);
  });

  it('die eigene Tabelle funktioniert für beide Lehrkräfte unverändert', async () => {
    const tableB = await service.getTable(teacherB.id, classB.id);
    expect(tableB.rows.map((r) => r.firstName)).toEqual(['Ben']);
    expect(tableB.rows[0].noteCount).toBe(0);
  });
});
