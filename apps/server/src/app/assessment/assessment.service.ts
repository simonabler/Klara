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
    if (dto.additionalComment !== undefined) result.additionalComment = dto.additionalComment ?? null;

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

  // ── Tabellenansicht ──────────────────────────────────────────────────────────

  async getTable(
    teacherId:  string,
    classId:    string,
    subjectId?: string,
    schoolYear?: string,
    gradingEnabled = false,
  ): Promise<import('@app/domain').BeurteilungTableDto> {
    // 1. Events dieser Klasse/Fach laden
    const where: any = { teacherId, classId };
    if (subjectId) where.subjectId = subjectId;

    const events = await this.eventRepo.find({
      where,
      relations: ['results'],
      order: { date: 'ASC' },
    });

    // Optional nach Schuljahr filtern (AssessmentEvent hat kein schoolYear-Feld,
    // daher über die Klasse — wir lassen alle Events der Klasse durch, da
    // schoolYear-Filterung optional ist und per classId bereits eingeschränkt)

    // 2. Schüler der Klasse laden
    const classRepo = this.studentRepo.manager.getRepository('Class');
    const cls: any = await classRepo.findOne({
      where: { id: classId },
      relations: ['students'],
    });
    const students: Student[] = cls?.students ?? [];

    // 3. Alle Ergebnisse für diese Events laden
    const eventIds = events.map(e => e.id);
    const allResults = eventIds.length > 0
      ? await this.resultRepo.find({ where: { assessmentEventId: In(eventIds) } })
      : [];

    // 4. Notiz-Anzahl pro Schüler/Fach laden
    const noteRepo = this.studentRepo.manager.getRepository('Note');
    const noteCounts: { studentId: string; count: string }[] = await noteRepo
      .createQueryBuilder('n')
      .select('n.studentId', 'studentId')
      .addSelect('COUNT(n.id)', 'count')
      .where('n.classId = :classId', { classId })
      .andWhere(subjectId ? 'n.subjectId = :subjectId' : '1=1', { subjectId })
      .groupBy('n.studentId')
      .getRawMany();

    const noteCountMap = new Map(noteCounts.map(r => [r.studentId, parseInt(r.count, 10)]));

    // 5. AssessmentTypes für Gewichtung laden
    const typeRepo = this.studentRepo.manager.getRepository('AssessmentType');
    const types: any[] = await typeRepo.find({ where: { teacherId } });

    // 6. Zeilen aufbauen
    const sortedStudents = [...students].sort((a, b) =>
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    );

    const rows: import('@app/domain').TableStudentRowDto[] = sortedStudents.map(student => {
      const cells: Record<string, import('@app/domain').TableCellDto> = {};
      let weightedSum = 0;
      let weightSum   = 0;

      for (const event of events) {
        const result = allResults.find(
          r => r.assessmentEventId === event.id && r.studentId === student.id,
        );
        if (result) {
          const rawValue = result.grade ?? result.points ?? (result.comment ?? undefined);
          cells[event.id] = {
            value:    rawValue,
            resultId: result.id,
            comment:  result.comment ?? undefined,
          };

          if (gradingEnabled && rawValue != null) {
            const numVal = typeof rawValue === 'number' ? rawValue : null;
            if (numVal !== null) {
              const weight = 1; // Default-Gewicht; AssessmentType wird in Phase 2 verknüpft
              weightedSum += numVal * weight;
              weightSum   += weight;
            }
          }
        }
      }

      const gradeAverage = (gradingEnabled && weightSum > 0)
        ? Math.round((weightedSum / weightSum) * 10) / 10
        : undefined;

      return {
        studentId:    student.id,
        firstName:    student.firstName,
        lastName:     student.lastName,
        avatarUrl:    student.avatarUrl ?? undefined,
        noteCount:    noteCountMap.get(student.id) ?? 0,
        cells,
        gradeAverage,
      };
    });

    // 7. Klassendurchschnitt
    const averages = rows.map(r => r.gradeAverage).filter((v): v is number => v !== undefined);
    const classAverage = (gradingEnabled && averages.length > 0)
      ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10
      : undefined;

    // 8. Spalten
    const columns: import('@app/domain').TableEventColumnDto[] = events.map(e => ({
      id:     e.id,
      title:  e.title,
      date:   e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date),
      schema: 'GRADES_1_5', // wird in Phase 2 aus AssessmentType gelesen
      weight: undefined,
      color:  undefined,
    }));

    return { columns, rows, classAverage, gradingEnabled };
  }
}
