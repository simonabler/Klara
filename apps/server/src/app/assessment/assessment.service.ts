import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';
import { Student } from '../student/student.entity';
import {
  CreateAssessmentEventDto,
  UpdateAssessmentEventDto,
  UpsertStudentResultDto,
} from '@app/domain';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(AssessmentEvent)
    private readonly eventRepo: Repository<AssessmentEvent>,
    @InjectRepository(StudentResult)
    private readonly resultRepo: Repository<StudentResult>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  // ── Events ──────────────────────────────────────────────────────────────

  findAllEvents(teacherId: string, classId?: string, subjectId?: string): Promise<AssessmentEvent[]> {
    const where: any = { teacherId };
    if (classId)   where.classId   = classId;
    if (subjectId) where.subjectId = subjectId;
    return this.eventRepo.find({
      where,
      relations: ['class', 'subject', 'results'],
      order: { date: 'DESC' },
    });
  }

  async findOneEvent(id: string, teacherId: string): Promise<AssessmentEvent> {
    const event = await this.eventRepo.findOne({
      where: { id, teacherId },
      relations: ['class', 'subject', 'results', 'results.student'],
    });
    if (!event) throw new NotFoundException('Leistungsereignis nicht gefunden');
    return event;
  }

  async createEvent(dto: CreateAssessmentEventDto, teacherId: string): Promise<AssessmentEvent> {
    const event = this.eventRepo.create({
      title:     dto.title,
      type:      dto.type,
      date:      dto.date as unknown as Date,
      classId:   dto.classId   ?? null,
      subjectId: dto.subjectId ?? null,
      teacherId,
      results:   [],
    });
    const saved = await this.eventRepo.save(event);

    // Schüler direkt bei Erstellung zuweisen
    if (dto.studentIds?.length) {
      await this.assignStudents(saved.id, dto.studentIds, teacherId);
    }

    return this.findOneEvent(saved.id, teacherId);
  }

  async updateEvent(id: string, dto: UpdateAssessmentEventDto, teacherId: string): Promise<AssessmentEvent> {
    const event = await this.findOneEvent(id, teacherId);
    if (dto.title     !== undefined) event.title     = dto.title;
    if (dto.type      !== undefined) event.type       = dto.type;
    if (dto.date      !== undefined) event.date       = dto.date as unknown as Date;
    if (dto.classId   !== undefined) event.classId    = dto.classId   ?? null;
    if (dto.subjectId !== undefined) event.subjectId  = dto.subjectId ?? null;
    await this.eventRepo.save(event);
    return this.findOneEvent(id, teacherId);
  }

  async removeEvent(id: string, teacherId: string): Promise<void> {
    const event = await this.findOneEvent(id, teacherId);
    await this.eventRepo.remove(event);
  }

  // ── Schülerzuweisung ─────────────────────────────────────────────────────

  async assignStudents(eventId: string, studentIds: string[], teacherId: string): Promise<AssessmentEvent> {
    const event = await this.findOneEvent(eventId, teacherId);

    // Bestehende Ergebnisse holen – vorhandene Schüler behalten
    const existingStudentIds = new Set((event.results ?? []).map(r => r.studentId));

    // Neue Schüler hinzufügen (keine doppelten Einträge)
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id));
    if (newStudentIds.length > 0) {
      const newResults = newStudentIds.map(studentId =>
        this.resultRepo.create({ assessmentEventId: eventId, studentId })
      );
      await this.resultRepo.save(newResults);
    }

    // Schüler die nicht mehr in der Liste sind, entfernen
    const toRemove = (event.results ?? []).filter(r => !studentIds.includes(r.studentId));
    if (toRemove.length > 0) {
      await this.resultRepo.remove(toRemove);
    }

    return this.findOneEvent(eventId, teacherId);
  }

  // ── Ergebnisse ───────────────────────────────────────────────────────────

  async upsertResult(
    eventId: string,
    dto: UpsertStudentResultDto,
    teacherId: string,
  ): Promise<StudentResult> {
    // Sicherstellen dass das Event der Lehrkraft gehört
    await this.findOneEvent(eventId, teacherId);

    let result = await this.resultRepo.findOne({
      where: { assessmentEventId: eventId, studentId: dto.studentId },
    });

    if (!result) {
      result = this.resultRepo.create({
        assessmentEventId: eventId,
        studentId: dto.studentId,
      });
    }

    if (dto.grade   !== undefined) result.grade   = dto.grade   ?? null;
    if (dto.points  !== undefined) result.points  = dto.points  ?? null;
    if (dto.comment !== undefined) result.comment = dto.comment ?? null;

    return this.resultRepo.save(result);
  }

  async bulkUpsertResults(
    eventId: string,
    results: UpsertStudentResultDto[],
    teacherId: string,
  ): Promise<AssessmentEvent> {
    for (const dto of results) {
      await this.upsertResult(eventId, dto, teacherId);
    }
    return this.findOneEvent(eventId, teacherId);
  }

  // ── Ergebnisse für einen Schüler ──────────────────────────────────────────

  findResultsForStudent(studentId: string, teacherId: string): Promise<StudentResult[]> {
    return this.resultRepo.find({
      where: {
        studentId,
        assessmentEvent: { teacherId },
      },
      relations: ['assessmentEvent', 'assessmentEvent.subject', 'assessmentEvent.class'],
      order: { assessmentEvent: { date: 'DESC' } },
    });
  }
}
