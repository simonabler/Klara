import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentDataExportDto } from '@app/domain';
import { Student } from './student.entity';
import { Teacher } from '../teacher/teacher.entity';
import { Note } from '../note/note.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { AssessmentType } from '../assessment/assessment-type.entity';
import { DEFAULT_TYPES } from '../assessment/assessment-type.service';
import { resolveType } from '../assessment/beurteilung-calc';

/**
 * Auskunft über alle Daten einer Schülerin / eines Schülers (DSGVO Art. 15).
 * Enthält nur Daten der eingeloggten Lehrkraft.
 */
@Injectable()
export class StudentExportService {
  constructor(
    @InjectRepository(Student)        private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher)        private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Note)           private readonly noteRepo: Repository<Note>,
    @InjectRepository(StudentResult)  private readonly resultRepo: Repository<StudentResult>,
    @InjectRepository(AssessmentType) private readonly typeRepo: Repository<AssessmentType>,
  ) {}

  async exportStudent(studentId: string, teacherId: string): Promise<StudentDataExportDto> {
    // Nur Schüler/innen der eigenen Lehrkraft – sonst 404
    const student = await this.studentRepo.findOne({ where: { id: studentId, teacherId }, relations: ['parents', 'classes'] });
    if (!student) throw new NotFoundException('Schüler nicht gefunden');

    const [teacher, notes, results, types] = await Promise.all([
      this.teacherRepo.findOne({ where: { id: teacherId } }),
      this.noteRepo.find({
        where: { studentId, teacherId },
        relations: ['subject', 'class'],
        order: { createdAt: 'ASC' },
      }),
      this.resultRepo.find({
        where: { studentId, assessmentEvent: { teacherId } },
        relations: ['assessmentEvent', 'assessmentEvent.subject', 'assessmentEvent.class'],
      }),
      this.typeRepo.find({ where: { teacherId } }),
    ]);

    // Event-Typ ist die ID eines Leistungstyps oder (ältere Events) ein Enum-Wert
    const typeName = (eventType: string): string =>
      resolveType(eventType, types)?.name
      ?? DEFAULT_TYPES.find((d) => d.defaultForEventType === eventType)?.name
      ?? eventType;

    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      responsible: { displayName: teacher?.displayName ?? '', email: teacher?.email ?? '' },
      retentionYears: teacher?.retentionYears ?? null,

      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: dateOnly(student.dateOfBirth),
        gender: student.gender ?? null,
        email: student.email ?? null,
        phone: student.phone ?? null,
        hasProfilePhoto: !!student.avatarUrl,
        createdAt: iso(student.createdAt),
        updatedAt: iso(student.updatedAt),
      },

      parents: (student.parents ?? [])
        .map((p) => ({ firstName: p.firstName, lastName: p.lastName, email: p.email ?? null, phone: p.phone ?? null }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de') || a.firstName.localeCompare(b.firstName, 'de')),

      classes: (student.classes ?? [])
        .map((c) => ({ name: c.name, schoolYear: c.schoolYear ?? null, schoolLevel: c.schoolLevel ?? null }))
        .sort((a, b) => (a.schoolYear ?? '').localeCompare(b.schoolYear ?? '') || a.name.localeCompare(b.name, 'de')),

      results: results
        .map((r) => {
          const e = r.assessmentEvent;
          return {
            date: dateOnly(e.date) ?? '',
            title: e.title,
            assessmentType: typeName(e.type),
            subject: (e.subject as any)?.name ?? null,
            class: (e.class as any)?.name ?? null,
            grade: r.grade ?? null,
            points: r.points ?? null,
            value: r.ptmValue ?? null,
            comment: r.comment ?? null,
            recordedAt: iso(r.createdAt),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date)),

      notes: notes.map((n) => ({
        createdAt: iso(n.createdAt),
        type: n.type,
        content: n.content,
        subject: (n.subject as any)?.name ?? null,
        class: (n.class as any)?.name ?? null,
      })),
    };
  }
}

function iso(d: Date | string | null | undefined): string {
  if (!d) return '';
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/** Datums-Spalten kommen je nach Treiber als 'YYYY-MM-DD' oder Date */
function dateOnly(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}
