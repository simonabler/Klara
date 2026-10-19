import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOperator, FindOptionsWhere, In, Repository } from 'typeorm';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';
import { AssessmentType } from './assessment-type.entity';
import { Student } from '../student/student.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { OwnershipValidationService } from '../common/ownership-validation.service';
import {
  CreateAssessmentEventDto,
  UpdateAssessmentEventDto,
  UpsertStudentResultDto,
  Semester,
  schoolYearOf,
  semesterBounds,
  toIsoDate,
} from '@app/domain';
import {
  AssessmentTypeLike,
  averageScale,
  resolveType,
  schemaFor,
  weightFor,
  weightedAverage,
} from './beurteilung-calc';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(AssessmentEvent)
    private readonly eventRepo: Repository<AssessmentEvent>,
    @InjectRepository(StudentResult)
    private readonly resultRepo: Repository<StudentResult>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    @InjectRepository(AssessmentType)
    private readonly typeRepo: Repository<AssessmentType>,
    private readonly ownership: OwnershipValidationService,
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
    // Vor dem Speichern prüfen – sonst bliebe bei fremden Schülern ein leeres Event zurück
    await this.ownership.assertStudents(teacherId, dto.studentIds ?? []);
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
    // Nur eigene Schüler – vor jeder Änderung prüfen, damit nichts halb geschrieben wird
    await this.ownership.assertStudents(teacherId, studentIds);

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
    // Sicherstellen dass Event und Schüler der Lehrkraft gehören
    await this.findOneEvent(eventId, teacherId);
    await this.ownership.assertStudents(teacherId, [dto.studentId]);
    return this.saveResult(eventId, dto);
  }

  async bulkUpsertResults(
    eventId: string,
    results: UpsertStudentResultDto[],
    teacherId: string,
  ): Promise<AssessmentEvent> {
    // Alle Schüler vorab prüfen – ein fremder Schüler bricht den ganzen Vorgang ab
    await this.findOneEvent(eventId, teacherId);
    await this.ownership.assertStudents(teacherId, results.map(r => r.studentId));
    for (const dto of results) {
      await this.saveResult(eventId, dto);
    }
    return this.findOneEvent(eventId, teacherId);
  }

  /** Speichert ein Ergebnis – Event und Schüler müssen vorher geprüft sein */
  private async saveResult(eventId: string, dto: UpsertStudentResultDto): Promise<StudentResult> {
    let result = await this.resultRepo.findOne({
      where: { assessmentEventId: eventId, studentId: dto.studentId },
    });

    if (!result) {
      result = this.resultRepo.create({
        assessmentEventId: eventId,
        studentId: dto.studentId,
      });
    }

    if (dto.grade    !== undefined) result.grade    = dto.grade    ?? null;
    if (dto.points   !== undefined) result.points   = dto.points   ?? null;
    if (dto.ptmValue !== undefined) result.ptmValue = dto.ptmValue ?? null;
    if (dto.comment  !== undefined) result.comment  = dto.comment  ?? null;

    return this.resultRepo.save(result);
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
    semester?: Semester,
  ): Promise<import('@app/domain').BeurteilungTableDto> {
    // 1. Klasse mit Schülern laden – nur die eigene. Fremde oder unbekannte
    //    Klassen ergeben 404, bevor irgendetwas anderes geladen wird.
    const cls = await this.classRepo.findOne({
      where: { id: classId, teacherId },
      relations: ['students'],
    });
    if (!cls) throw new NotFoundException('Klasse nicht gefunden');
    const students: Student[] = cls.students ?? [];

    // 2. Optional auf ein Semester eingrenzen. Das Schuljahr kommt aus dem
    //    Request, sonst von der Klasse, sonst ist es das aktuelle.
    //    Ohne Semester bleiben (wie bisher) alle Events der Klasse sichtbar.
    const range = semester
      ? semesterBounds(schoolYear || cls.schoolYear || schoolYearOf(new Date()), semester)
      : undefined;

    // 3. Events dieser Klasse/Fach laden
    const where: FindOptionsWhere<AssessmentEvent> = { teacherId, classId };
    if (subjectId) where.subjectId = subjectId;
    // Spalte vom Typ 'date' → Vergleich mit ISO-Datum (YYYY-MM-DD), nicht mit Date
    if (range) where.date = Between(toIsoDate(range.from), toIsoDate(range.to)) as FindOperator<unknown> as FindOperator<Date>;

    const events = await this.eventRepo.find({
      where,
      relations: ['results'],
      order: { date: 'ASC' },
    });

    // 4. Alle Ergebnisse für diese Events laden
    const eventIds = events.map(e => e.id);
    const allResults = eventIds.length > 0
      ? await this.resultRepo.find({ where: { assessmentEventId: In(eventIds) } })
      : [];

    // 5. Notiz-Anzahl pro Schüler/Fach laden (im Semester-Zeitraum, falls gewählt)
    const noteQuery = this.noteRepo
      .createQueryBuilder('n')
      .select('n.studentId', 'studentId')
      .addSelect('COUNT(n.id)', 'count')
      .where('n.classId = :classId', { classId })
      .andWhere('n.teacherId = :teacherId', { teacherId });
    if (subjectId) noteQuery.andWhere('n.subjectId = :subjectId', { subjectId });
    if (range) {
      const dayAfter = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate() + 1);
      noteQuery.andWhere('n.createdAt >= :from AND n.createdAt < :until', { from: range.from, until: dayAfter });
    }
    const noteCounts: { studentId: string; count: string }[] = await noteQuery
      .groupBy('n.studentId')
      .getRawMany();

    const noteCountMap = new Map(noteCounts.map(r => [r.studentId, parseInt(r.count, 10)]));

    // 6. Leistungstyp, Schema und Gewicht je Event bestimmen
    const types: AssessmentTypeLike[] = await this.typeRepo.find({ where: { teacherId } });

    const eventMeta = new Map(events.map(e => {
      const type = resolveType(e.type, types);
      return [e.id, { type, schema: schemaFor(e.type, type), weight: weightFor(type) }];
    }));

    // Ø nur aus Noten einer einzigen Skala – Punkte, +/~/− und Bestanden zählen nicht
    const scale = gradingEnabled
      ? averageScale([...eventMeta.values()].map(m => m.schema))
      : undefined;
    const countsToAverage = (eventId: string) => scale !== undefined && eventMeta.get(eventId)?.schema === scale;

    // 7. Zeilen aufbauen
    const sortedStudents = [...students].sort((a, b) =>
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    );

    const rows: import('@app/domain').TableStudentRowDto[] = sortedStudents.map(student => {
      const cells: Record<string, import('@app/domain').TableCellDto> = {};
      const gradeValues: { value: number; weight: number }[] = [];

      for (const event of events) {
        const result = allResults.find(
          r => r.assessmentEventId === event.id && r.studentId === student.id,
        );
        if (result) {
          const rawValue = result.grade ?? result.points ?? result.ptmValue ?? undefined;
          cells[event.id] = {
            value:    rawValue,
            resultId: result.id,
            comment:  result.comment ?? undefined,
          };

          if (countsToAverage(event.id) && typeof result.grade === 'number') {
            gradeValues.push({ value: result.grade, weight: eventMeta.get(event.id)!.weight });
          }
        }
      }

      const gradeAverage = gradingEnabled ? weightedAverage(gradeValues) : undefined;

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

    // 8. Klassendurchschnitt (Mittel der Schüler-Durchschnitte)
    const averages = rows.map(r => r.gradeAverage).filter((v): v is number => v !== undefined);
    const classAverage = gradingEnabled
      ? weightedAverage(averages.map(value => ({ value, weight: 1 })))
      : undefined;

    // 9. Spalten – `weight` nur bei Spalten, die in den Ø einfließen
    const columns: import('@app/domain').TableEventColumnDto[] = events.map(e => {
      const meta = eventMeta.get(e.id)!;
      return {
        id:     e.id,
        title:  e.title,
        date:   e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date),
        schema: meta.schema,
        weight: countsToAverage(e.id) ? meta.weight : undefined,
        color:  meta.type?.color ?? undefined,
      };
    });

    return { columns, rows, classAverage, gradingEnabled };
  }
}
