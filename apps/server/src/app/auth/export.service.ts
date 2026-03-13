import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../student/student.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';

/**
 * Exportiert alle Daten einer Lehrkraft als strukturiertes JSON-Objekt.
 * DSGVO Art. 20 – Recht auf Datenportabilität.
 */
@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    @InjectRepository(AssessmentEvent)
    private readonly eventRepo: Repository<AssessmentEvent>,
  ) {}

  async exportAll(teacherId: string): Promise<object> {
    const students = await this.studentRepo.find({
      where: { teacherId },
      relations: ['parents', 'classes'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const notes = await this.noteRepo.find({
      where: { teacherId },
      relations: ['subject', 'class'],
      order: { createdAt: 'DESC' },
    });

    const events = await this.eventRepo.find({
      where: { teacherId },
      relations: ['subject', 'class', 'results', 'results.student'],
      order: { date: 'DESC' },
    });

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      students: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        dateOfBirth: s.dateOfBirth ?? null,
        classes: s.classes?.map((c) => ({ name: (c as any).name })) ?? [],
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
          return st ? `${st.firstName} ${st.lastName}` : n.studentId;
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
            : r.studentId,
          grade: r.grade ?? null,
          points: r.points ?? null,
          comment: r.comment ?? null,
        })) ?? [],
      })),
    };
  }
}
