import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../teacher/teacher.entity';
import { Student } from '../student/student.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { Subject } from '../subject/subject.entity';
import { Class } from '../class/class.entity';

/**
 * Exportiert alle Daten einer Lehrkraft als strukturiertes JSON-Objekt.
 * DSGVO Art. 20 – Recht auf Datenportabilität.
 */
@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    @InjectRepository(AssessmentEvent)
    private readonly eventRepo: Repository<AssessmentEvent>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
  ) {}

  async exportAll(teacherId: string): Promise<object> {
    const [teacher, students, notes, events, subjects, classes] = await Promise.all([
      this.teacherRepo.findOne({ where: { id: teacherId } }),
      this.studentRepo.find({
        where: { teacherId },
        relations: ['parents', 'classes'],
        order: { lastName: 'ASC', firstName: 'ASC' },
      }),
      this.noteRepo.find({
        where: { teacherId },
        relations: ['subject', 'class'],
        order: { createdAt: 'DESC' },
      }),
      this.eventRepo.find({
        where: { teacherId },
        relations: ['subject', 'class', 'results', 'results.student'],
        order: { date: 'DESC' },
      }),
      this.subjectRepo.find({
        where: { teacherId },
        order: { name: 'ASC' },
      }),
      this.classRepo.find({
        where: { teacherId },
        order: { name: 'ASC' },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',

      profile: teacher ? {
        displayName: teacher.displayName,
        email: teacher.email,
        memberSince: teacher.createdAt,
      } : null,

      subjects: subjects.map((s) => ({
        name: s.name,
      })),

      classes: classes.map((c) => ({
        name: c.name,
        schoolYear: c.schoolYear ?? null,
        schoolLevel: c.schoolLevel ?? null,
      })),

      students: students.map((s) => ({
        firstName: s.firstName,
        lastName: s.lastName,
        dateOfBirth: s.dateOfBirth ?? null,
        classes: s.classes?.map((c) => c.name) ?? [],
        parents: s.parents?.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email ?? null,
          phone: p.phone ?? null,
        })) ?? [],
        createdAt: s.createdAt,
      })),

      notes: notes.map((n) => ({
        type: n.type,
        content: n.content,
        subject: (n.subject as any)?.name ?? null,
        class: (n.class as any)?.name ?? null,
        student: (() => {
          const st = students.find((s) => s.id === n.studentId);
          return st ? `${st.firstName} ${st.lastName}` : null;
        })(),
        createdAt: n.createdAt,
      })),

      assessmentEvents: events.map((e) => ({
        title: e.title,
        type: e.type,
        date: e.date,
        subject: (e.subject as any)?.name ?? null,
        class: (e.class as any)?.name ?? null,
        results: e.results?.map((r) => ({
          student: r.student
            ? `${r.student.firstName} ${r.student.lastName}`
            : null,
          grade: r.grade ?? null,
          points: r.points ?? null,
          comment: r.comment ?? null,
        })) ?? [],
      })),
    };
  }
}
