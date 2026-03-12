import 'reflect-metadata';
import { NoteType, AssessmentEventType } from '@app/domain';
import { Student } from './student/student.entity';
import { Parent } from './parent/parent.entity';
import { Class } from './class/class.entity';
import { Subject } from './subject/subject.entity';
import { SchoolLevel } from './school-level/school-level.entity';
import { Note } from './note/note.entity';
import { AssessmentEvent } from './assessment/assessment-event.entity';
import { StudentResult } from './assessment/student-result.entity';

describe('Domain Entities – structure smoke tests', () => {
  it('Student has required fields', () => {
    const s = new Student();
    s.firstName = 'Anna';
    s.lastName = 'Muster';
    s.teacherId = 'teacher-uuid';
    expect(s.firstName).toBe('Anna');
    expect(s.teacherId).toBe('teacher-uuid');
  });

  it('Parent references a student', () => {
    const p = new Parent();
    p.firstName = 'Maria';
    p.lastName = 'Muster';
    p.studentId = 'student-uuid';
    expect(p.studentId).toBe('student-uuid');
  });

  it('Class holds name and teacherId', () => {
    const c = new Class();
    c.name = '3A';
    c.teacherId = 'teacher-uuid';
    expect(c.name).toBe('3A');
  });

  it('Subject holds name and teacherId', () => {
    const s = new Subject();
    s.name = 'Mathematik';
    s.teacherId = 'teacher-uuid';
    expect(s.name).toBe('Mathematik');
  });

  it('SchoolLevel holds name and year', () => {
    const sl = new SchoolLevel();
    sl.name = '3. Klasse';
    sl.year = '2024/25';
    expect(sl.year).toBe('2024/25');
  });

  it('Note has valid NoteType values', () => {
    expect(Object.values(NoteType)).toContain('PARTICIPATION');
    expect(Object.values(NoteType)).toContain('BEHAVIOUR');
    expect(Object.values(NoteType)).toContain('GENERAL');

    const n = new Note();
    n.type = NoteType.PARTICIPATION;
    n.content = 'Sehr aktiv';
    expect(n.type).toBe(NoteType.PARTICIPATION);
  });

  it('AssessmentEvent has valid type values', () => {
    expect(Object.values(AssessmentEventType)).toContain('ORAL_CHECK');
    expect(Object.values(AssessmentEventType)).toContain('WRITTEN_CHECK');
    expect(Object.values(AssessmentEventType)).toContain('EXAM');

    const e = new AssessmentEvent();
    e.type = AssessmentEventType.EXAM;
    expect(e.type).toBe(AssessmentEventType.EXAM);
  });

  it('StudentResult allows grade, points and comment independently', () => {
    const r1 = new StudentResult();
    r1.grade = 1;
    expect(r1.grade).toBe(1);
    expect(r1.points).toBeUndefined();

    const r2 = new StudentResult();
    r2.points = 47.5;
    r2.comment = 'Sehr gut';
    expect(r2.grade).toBeUndefined();
    expect(r2.comment).toBe('Sehr gut');
  });
});
