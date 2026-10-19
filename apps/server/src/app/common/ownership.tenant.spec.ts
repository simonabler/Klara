import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AssessmentEventType, NoteType, RepeatType } from '@app/domain';
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
import { NoteService } from '../note/note.service';
import { TimetableService } from '../timetable/timetable.service';
import { TimetableEntry } from '../timetable/timetable-entry.entity';

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
  let notes: NoteService;
  let timetable: TimetableService;
  let classA: Class;
  let classB: Class;
  let subjectA: Subject;
  let subjectB: Subject;

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
        TimetableEntry,
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

    const classes = ds.getRepository(Class);
    classA = await classes.save({ name: '3A', teacherId: teacherA.id });
    classB = await classes.save({ name: '4B', teacherId: teacherB.id });
    const subjects = ds.getRepository(Subject);
    subjectA = await subjects.save({ name: 'Deutsch', teacherId: teacherA.id });
    subjectB = await subjects.save({ name: 'Mathe', teacherId: teacherB.id });

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
    notes = new NoteService(ds.getRepository(Note), ownership);
    timetable = new TimetableService(
      ds.getRepository(TimetableEntry),
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

  describe('Fremdschlüssel beim Anlegen und Ändern (K-02)', () => {
    const note = (refs: {
      studentId: string;
      classId?: string;
      subjectId?: string;
    }) => ({
      content: 'Beobachtung',
      type: NoteType.GENERAL,
      ...refs,
    });
    const entry = (refs: { classId: string; subjectId: string }) => ({
      ...refs,
      dayOfWeek: 1,
      period: 2,
      repeatType: RepeatType.WEEKLY,
      schoolYear: '2026/27',
    });

    it.each([
      ['fremder Schüler', () => note({ studentId: studentA.id })],
      [
        'fremde Klasse',
        () => note({ studentId: studentB.id, classId: classA.id }),
      ],
      [
        'fremdes Fach',
        () => note({ studentId: studentB.id, subjectId: subjectA.id }),
      ],
    ])('Notiz anlegen: %s → 403, nichts gespeichert', async (_name, dto) => {
      const before = await ds.getRepository(Note).count();
      await expect(notes.create(dto(), teacherB.id)).rejects.toThrow(
        ForbiddenException
      );
      expect(await ds.getRepository(Note).count()).toBe(before);
    });

    it('Notiz ändern: fremde Klasse/fremdes Fach → 403, unverändert', async () => {
      const own = await notes.create(
        note({ studentId: studentB.id, classId: classB.id }),
        teacherB.id
      );
      await expect(
        notes.update(own.id, { classId: classA.id }, teacherB.id)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        notes.update(own.id, { subjectId: subjectA.id }, teacherB.id)
      ).rejects.toThrow(ForbiddenException);
      const reloaded = await notes.findOne(own.id, teacherB.id);
      expect(reloaded.classId).toBe(classB.id);
      expect(reloaded.class?.name).toBe('4B');
      expect(reloaded.subjectId).toBeNull();
    });

    it('Notiz mit eigenen Referenzen funktioniert unverändert', async () => {
      const own = await notes.create(
        note({
          studentId: studentB.id,
          classId: classB.id,
          subjectId: subjectB.id,
        }),
        teacherB.id
      );
      expect(own).toMatchObject({ classId: classB.id, subjectId: subjectB.id });
    });

    it('Stundenplan anlegen: fremde Klasse oder fremdes Fach → 403', async () => {
      await expect(
        timetable.create(
          teacherB.id,
          entry({ classId: classA.id, subjectId: subjectB.id })
        )
      ).rejects.toThrow(ForbiddenException);
      await expect(
        timetable.create(
          teacherB.id,
          entry({ classId: classB.id, subjectId: subjectA.id })
        )
      ).rejects.toThrow(ForbiddenException);
      expect(await ds.getRepository(TimetableEntry).count()).toBe(0);
    });

    it('Stundenplan ändern: fremde Klasse → 403, eigener Eintrag funktioniert', async () => {
      const own = await timetable.create(
        teacherB.id,
        entry({ classId: classB.id, subjectId: subjectB.id })
      );
      expect(own).toMatchObject({ className: '4B', subjectName: 'Mathe' });
      await expect(
        timetable.update(teacherB.id, own.id, { classId: classA.id })
      ).rejects.toThrow(ForbiddenException);
      const [reloaded] = await timetable.findAll(teacherB.id, '2026/27');
      expect(reloaded.classId).toBe(classB.id);
    });

    it('Leistungsereignis: fremde Klasse oder fremdes Fach → 403', async () => {
      const base = {
        title: 'X',
        type: AssessmentEventType.EXAM,
        date: '2026-10-19',
      };
      const before = await ds.getRepository(AssessmentEvent).count();
      await expect(
        assessments.createEvent({ ...base, classId: classA.id }, teacherB.id)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        assessments.createEvent(
          { ...base, subjectId: subjectA.id },
          teacherB.id
        )
      ).rejects.toThrow(ForbiddenException);
      expect(await ds.getRepository(AssessmentEvent).count()).toBe(before);

      const own = await eventOfB();
      await expect(
        assessments.updateEvent(own.id, { classId: classA.id }, teacherB.id)
      ).rejects.toThrow(ForbiddenException);
      const ok = await assessments.updateEvent(
        own.id,
        { classId: classB.id, subjectId: subjectB.id },
        teacherB.id
      );
      expect(ok).toMatchObject({ classId: classB.id, subjectId: subjectB.id });
    });
  });
});
