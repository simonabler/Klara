import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AssessmentEventType } from '@app/domain';
import { OwnershipValidationService } from './ownership-validation.service';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { AssessmentType } from '../assessment/assessment-type.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { Parent } from '../parent/parent.entity';
import { Student } from '../student/student.entity';
import { Subject } from '../subject/subject.entity';
import { Teacher } from '../teacher/teacher.entity';

/**
 * Mandantentrennung beim Schreiben mit echter Datenbank (SQLite in-memory):
 * Lehrkraft B versucht, Schüler, Klassen und Fächer von Lehrkraft A zu referenzieren.
 */
describe('Eigentümerprüfung beim Schreiben (Mandantentrennung)', () => {
  let ds: DataSource;
  let ownership: OwnershipValidationService;
  let assessments: AssessmentService;
  let teacherA: Teacher;
  let teacherB: Teacher;
  let studentA: Student;
  let studentB: Student;

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
      teacherId: teacherA.id,
    });
    studentB = await students.save({
      firstName: 'Ben',
      lastName: 'Huber',
      teacherId: teacherB.id,
    });

    ownership = new OwnershipValidationService(
      ds.getRepository(Student),
      ds.getRepository(Class),
      ds.getRepository(Subject)
    );
    assessments = new AssessmentService(
      ds.getRepository(AssessmentEvent),
      ds.getRepository(StudentResult),
      ds.getRepository(Class),
      ds.getRepository(Note),
      ds.getRepository(AssessmentType),
      ownership
    );
  });

  afterAll(() => ds?.destroy());

  async function eventOfB() {
    return ds.getRepository(AssessmentEvent).save({
      title: 'Test B',
      type: AssessmentEventType.EXAM,
      date: '2026-10-19' as unknown as Date,
      teacherId: teacherB.id,
    });
  }

  async function resultsOf(eventId: string) {
    return ds
      .getRepository(StudentResult)
      .find({ where: { assessmentEventId: eventId } });
  }

  describe('Leistungsdaten (K-01)', () => {
    it('assignStudents: fremder Schüler → 403, keine Zuordnung', async () => {
      const event = await eventOfB();
      await expect(
        assessments.assignStudents(
          event.id,
          [studentB.id, studentA.id],
          teacherB.id
        )
      ).rejects.toThrow(ForbiddenException);
      expect(await resultsOf(event.id)).toEqual([]);
    });

    it('upsertResult: fremder Schüler → 403, kein Ergebnis', async () => {
      const event = await eventOfB();
      await expect(
        assessments.upsertResult(
          event.id,
          { studentId: studentA.id, grade: 1 },
          teacherB.id
        )
      ).rejects.toThrow(ForbiddenException);
      expect(await resultsOf(event.id)).toEqual([]);
    });

    it('bulkUpsertResults: ein fremder Schüler bricht alles ab', async () => {
      const event = await eventOfB();
      const results = [
        { studentId: studentB.id, grade: 2 },
        { studentId: studentA.id, grade: 1 },
      ];
      await expect(
        assessments.bulkUpsertResults(event.id, results, teacherB.id)
      ).rejects.toThrow(ForbiddenException);
      expect(await resultsOf(event.id)).toEqual([]);
    });

    it('createEvent: fremder Schüler → 403, kein Event', async () => {
      const before = await ds.getRepository(AssessmentEvent).count();
      const dto = {
        title: 'X',
        type: AssessmentEventType.EXAM,
        date: '2026-10-19',
        studentIds: [studentA.id],
      };
      await expect(assessments.createEvent(dto, teacherB.id)).rejects.toThrow(
        ForbiddenException
      );
      expect(await ds.getRepository(AssessmentEvent).count()).toBe(before);
    });

    it('unbekannte Schüler-IDs werden wie fremde behandelt', async () => {
      const event = await eventOfB();
      await expect(
        assessments.assignStudents(
          event.id,
          ['00000000-0000-4000-8000-000000000000'],
          teacherB.id
        )
      ).rejects.toThrow('Ungültige Schülerzuweisung');
    });

    it('eigene Schüler funktionieren unverändert', async () => {
      const event = await eventOfB();
      await assessments.assignStudents(event.id, [studentB.id], teacherB.id);
      await assessments.upsertResult(
        event.id,
        { studentId: studentB.id, grade: 2 },
        teacherB.id
      );
      const results = await resultsOf(event.id);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ studentId: studentB.id, grade: 2 });
    });
  });
});
