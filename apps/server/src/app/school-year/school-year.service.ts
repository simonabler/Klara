import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  PurgeResultDto,
  RetentionOverviewDto,
  RetentionYearDto,
  RolloverRequestDto,
  RolloverResultDto,
  isRetentionDue,
  isValidSchoolYear,
  retentionDeletableFrom,
  schoolYearStart,
  toIsoDate,
} from '@app/domain';
import { Teacher } from '../teacher/teacher.entity';
import { Class } from '../class/class.entity';
import { Student } from '../student/student.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { TimetableEntry } from '../timetable/timetable-entry.entity';
import { deleteAvatarFiles } from '../common/avatar-files';
import { planStudentDeletion } from './student-deletion-plan';

@Injectable()
export class SchoolYearService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Teacher)         private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Class)           private readonly classRepo: Repository<Class>,
    @InjectRepository(Note)            private readonly noteRepo: Repository<Note>,
    @InjectRepository(AssessmentEvent) private readonly eventRepo: Repository<AssessmentEvent>,
  ) {}

  // ── Schuljahreswechsel ─────────────────────────────────────────────────────

  /**
   * Legt für die gewählten Klassen je eine neue Klasse im Folgeschuljahr an
   * und übernimmt alle Schüler/innen. Die alten Klassen bleiben unverändert.
   * Alles oder nichts: Bei einem Fehler wird keine Klasse angelegt.
   */
  async rollover(teacherId: string, dto: RolloverRequestDto): Promise<RolloverResultDto> {
    const { fromSchoolYear: from, toSchoolYear: to } = dto;
    if (!isValidSchoolYear(from) || !isValidSchoolYear(to)) {
      throw new BadRequestException('Ungültiges Schuljahr');
    }
    if (schoolYearStart(to) <= schoolYearStart(from)) {
      throw new BadRequestException('Das neue Schuljahr muss nach dem bisherigen liegen');
    }

    const items = dto.classes.map((c) => ({ ...c, name: c.name.trim() }));
    if (items.some((c) => !c.name)) throw new BadRequestException('Jede Klasse braucht einen Namen');
    if (hasDuplicates(items.map((c) => c.sourceClassId))) {
      throw new BadRequestException('Eine Klasse wurde mehrfach ausgewählt');
    }
    if (hasDuplicates(items.map((c) => c.name.toLowerCase()))) {
      throw new BadRequestException('Klassennamen im neuen Schuljahr müssen eindeutig sein');
    }

    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(Class);
      const sources = await repo.find({
        where: { id: In(items.map((c) => c.sourceClassId)), teacherId },
        relations: ['students'],
      });
      if (sources.length !== items.length) throw new NotFoundException('Klasse nicht gefunden');
      const wrongYear = sources.filter((c) => c.schoolYear !== from);
      if (wrongYear.length > 0) {
        throw new BadRequestException(`Nicht im Schuljahr ${from}: ${wrongYear.map((c) => c.name).join(', ')}`);
      }

      const existing = await repo.find({ where: { teacherId, schoolYear: to } });
      const taken = new Set(existing.map((c) => c.name.trim().toLowerCase()));
      const conflicts = items.filter((c) => taken.has(c.name.toLowerCase())).map((c) => c.name);
      if (conflicts.length > 0) {
        throw new ConflictException(`Im Schuljahr ${to} gibt es bereits: ${conflicts.join(', ')}`);
      }

      const created: RolloverResultDto['created'] = [];
      for (const item of items) {
        const source = sources.find((c) => c.id === item.sourceClassId)!;
        const saved = await repo.save(repo.create({
          name: item.name,
          schoolYear: to,
          schoolLevel: item.schoolLevel ?? (source.schoolLevel ? source.schoolLevel + 1 : undefined),
          teacherId,
          students: source.students ?? [],
        }));
        created.push({ id: saved.id, name: saved.name, schoolYear: to, studentCount: source.students?.length ?? 0 });
      }
      return { created };
    });
  }

  // ── Aufbewahrung / Löschfristen ────────────────────────────────────────────

  async setRetention(teacherId: string, retentionYears: number | null): Promise<{ retentionYears: number | null }> {
    await this.teacherRepo.update(teacherId, { retentionYears });
    return { retentionYears };
  }

  /** Eingestellte Frist und alle Schuljahre, deren Frist abgelaufen ist */
  async getRetention(teacherId: string, today: Date = new Date()): Promise<RetentionOverviewDto> {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    const years = teacher?.retentionYears ?? null;
    if (!years) return { retentionYears: null, due: [] };

    const classes = await this.classRepo.find({ where: { teacherId }, relations: ['students'] });
    const dueYears = [...new Set(classes.map((c) => c.schoolYear))]
      .filter((sy): sy is string => !!sy && isValidSchoolYear(sy) && isRetentionDue(sy, years, today))
      .sort();

    const due = await Promise.all(dueYears.map((sy) => this.describeYear(teacherId, sy, classes, years)));
    return { retentionYears: years, due };
  }

  /**
   * Löscht alle Daten eines Schuljahres, dessen Frist abgelaufen ist:
   * Klassen, deren Leistungen und Notizen, Stundenplan-Einträge sowie
   * Schüler/innen, die in keiner anderen Klasse mehr sind (inkl. Eltern,
   * Ergebnissen, Notizen und Profilbild). Läuft in einer Transaktion.
   */
  async purge(teacherId: string, schoolYear: string, today: Date = new Date()): Promise<PurgeResultDto> {
    if (!isValidSchoolYear(schoolYear)) throw new BadRequestException('Ungültiges Schuljahr');
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    const years = teacher?.retentionYears ?? null;
    if (!years) throw new BadRequestException('Es ist keine Aufbewahrungsfrist eingestellt');
    if (!isRetentionDue(schoolYear, years, today)) {
      const from = toIsoDate(retentionDeletableFrom(schoolYear, years)).split('-').reverse().join('.');
      throw new BadRequestException(`Die Frist für ${schoolYear} läuft erst am ${from} ab`);
    }

    const avatarUrls: (string | null)[] = [];
    const result = await this.dataSource.transaction(async (em) => {
      const allClasses = await em.getRepository(Class).find({ where: { teacherId }, relations: ['students'] });
      const classIds = allClasses.filter((c) => c.schoolYear === schoolYear).map((c) => c.id);
      if (classIds.length === 0) throw new NotFoundException(`Keine Klassen im Schuljahr ${schoolYear}`);

      const studentIds = [...planStudentDeletion(schoolYear, allClasses).toDelete];

      // Zählen vor dem Löschen: Notizen der Klassen + übrige Notizen gelöschter Schüler/innen
      const deletedNotes = await em.getRepository(Note).count({ where: this.noteWhere(teacherId, classIds, studentIds) });

      const deletedAssessments = await deleteCount(em.getRepository(AssessmentEvent), { teacherId, classId: In(classIds) });
      await em.getRepository(Note).delete({ teacherId, classId: In(classIds) });
      const deletedTimetableEntries = await deleteCount(em.getRepository(TimetableEntry), { teacherId, classId: In(classIds) });

      let deletedStudents = 0;
      if (studentIds.length > 0) {
        const students = await em.getRepository(Student).find({ where: { id: In(studentIds), teacherId } });
        avatarUrls.push(...students.map((s) => s.avatarUrl));
        // Eltern, Ergebnisse, restliche Notizen und Klassenzuordnungen per ON DELETE CASCADE
        deletedStudents = await deleteCount(em.getRepository(Student), { id: In(studentIds), teacherId });
      }

      const deletedClasses = await deleteCount(em.getRepository(Class), { id: In(classIds), teacherId });

      return { schoolYear, deletedClasses, deletedStudents, deletedNotes, deletedAssessments, deletedTimetableEntries };
    });

    // Dateien erst nach erfolgreichem Commit löschen
    await deleteAvatarFiles(avatarUrls);
    return result;
  }

  private async describeYear(
    teacherId: string,
    schoolYear: string,
    allClasses: Class[],
    retentionYears: number,
  ): Promise<RetentionYearDto> {
    const inYear = allClasses.filter((c) => c.schoolYear === schoolYear);
    const classIds = inYear.map((c) => c.id);
    const { toDelete, kept } = planStudentDeletion(schoolYear, allClasses);
    const [noteCount, assessmentCount] = await Promise.all([
      this.noteRepo.count({ where: this.noteWhere(teacherId, classIds, [...toDelete]) }),
      this.eventRepo.count({ where: { teacherId, classId: In(classIds) } }),
    ]);
    return {
      schoolYear,
      deletableFrom: toIsoDate(retentionDeletableFrom(schoolYear, retentionYears)),
      classes: inYear
        .map((c) => ({ id: c.id, name: c.name, studentCount: c.students?.length ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
      noteCount,
      assessmentCount,
      studentsToDelete: toDelete.size,
      studentsKept: kept.size,
    };
  }

  /** Notizen der Klassen oder der zu löschenden Schüler/innen (ohne Doppelzählung) */
  private noteWhere(teacherId: string, classIds: string[], studentIds: string[]) {
    const where: any[] = [{ teacherId, classId: In(classIds) }];
    if (studentIds.length > 0) where.push({ teacherId, studentId: In(studentIds) });
    return where;
  }
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

async function deleteCount(repo: Repository<any>, where: any): Promise<number> {
  const res = await repo.delete(where);
  return res.affected ?? 0;
}
