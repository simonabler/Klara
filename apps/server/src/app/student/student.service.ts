import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { Parent } from '../parent/parent.entity';
import { Class } from '../class/class.entity';
import { CreateStudentDto, ImportStudentRowDto, ImportResultDto, UpdateStudentDto } from '@app/domain';

/**
 * Parst Datumsstrings in verschiedenen Formaten zu einem Date-Objekt.
 * Unterstützt: YYYY-MM-DD, DD.MM.YYYY, DD.MM.YY
 * Gibt undefined zurück wenn das Datum nicht geparst werden kann.
 */
function parseDateOfBirth(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();

  // Format: DD.MM.YYYY oder DD.MM.YY
  const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const day   = parseInt(dotMatch[1], 10);
    const month = parseInt(dotMatch[2], 10) - 1;
    let year    = parseInt(dotMatch[3], 10);
    if (year < 100) year += year < 30 ? 2000 : 1900;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // Format: YYYY-MM-DD (ISO)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepo: Repository<Parent>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
  ) {}

  async findAll(teacherId: string): Promise<Student[]> {
    return this.studentRepo.find({
      where: { teacherId },
      relations: ['parents', 'classes'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async findOne(id: string, teacherId: string): Promise<Student> {
    const student = await this.studentRepo.findOne({
      where: { id, teacherId },
      relations: ['parents', 'classes'],
    });
    if (!student) throw new NotFoundException('Schüler nicht gefunden');
    return student;
  }

  async create(dto: CreateStudentDto, teacherId: string): Promise<Student> {
    const student = this.studentRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: parseDateOfBirth(dto.dateOfBirth),
      email: dto.email?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      gender: dto.gender || undefined,
      teacherId,
    });
    const saved = await this.studentRepo.save(student);

    if (dto.parents?.length) {
      const parents = dto.parents.map((p) =>
        this.parentRepo.create({ ...p, studentId: saved.id }),
      );
      await this.parentRepo.save(parents);
    }

    return this.findOne(saved.id, teacherId);
  }

  async update(
    id: string,
    dto: UpdateStudentDto,
    teacherId: string,
  ): Promise<Student> {
    const student = await this.findOne(id, teacherId);

    if (dto.firstName !== undefined) student.firstName = dto.firstName;
    if (dto.lastName !== undefined) student.lastName = dto.lastName;
    if (dto.dateOfBirth !== undefined)
      student.dateOfBirth = parseDateOfBirth(dto.dateOfBirth);
    if (dto.email !== undefined) student.email = dto.email?.trim() || null;
    if (dto.phone !== undefined) student.phone = dto.phone?.trim() || null;
    if (dto.gender !== undefined) student.gender = dto.gender || null;

    await this.studentRepo.save(student);

    if (dto.parents !== undefined) {
      await this.parentRepo.delete({ studentId: id });
      if (dto.parents.length) {
        const parents = dto.parents.map((p) =>
          this.parentRepo.create({ ...p, studentId: id }),
        );
        await this.parentRepo.save(parents);
      }
    }

    return this.findOne(id, teacherId);
  }

  async updateAvatar(
    id: string,
    teacherId: string,
    avatarUrl: string,
  ): Promise<Student> {
    const student = await this.findOne(id, teacherId);
    student.avatarUrl = avatarUrl;
    await this.studentRepo.save(student);
    return student;
  }

  async bulkImport(rows: ImportStudentRowDto[], teacherId: string): Promise<ImportResultDto> {
    const result: ImportResultDto = { imported: 0, skipped: 0, classesCreated: 0, errors: [] };

    // Cache für Klassen (name+schoolYear → classId) um mehrfache DB-Abfragen zu vermeiden
    const classCache = new Map<string, string>();

    // Duplikat-Erkennung innerhalb des Imports: firstName+lastName+dateOfBirth → Student
    const importedStudents = new Map<string, Student>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const firstName = row.firstName?.trim();
      const lastName  = row.lastName?.trim();

      if (!firstName || !lastName) {
        result.skipped++;
        result.errors.push({ row: rowNum, reason: 'Vor- und Nachname sind Pflichtfelder' });
        continue;
      }

      try {
        // ── Duplikat-Erkennung: gleicher Name + Geburtsdatum = selber Schüler ──
        const dedupKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${row.dateOfBirth ?? ''}`;
        let student = importedStudents.get(dedupKey);

        if (!student) {
          // Neuen Schüler anlegen
          student = this.studentRepo.create({
            firstName,
            lastName,
            dateOfBirth: parseDateOfBirth(row.dateOfBirth),
            email: row.email?.trim() || undefined,
            phone: row.phone?.trim() || undefined,
            gender: row.gender?.trim() || undefined,
            teacherId,
          });
          student = await this.studentRepo.save(student);
          importedStudents.set(dedupKey, student);
          result.imported++;
        }
        // Bei Duplikat: Schüler existiert bereits, wir springen direkt zur Klassenlogik

        // ── Parent speichern (auch bei Duplikat, falls neue Kontaktdaten) ──
        const p1First = row.parent1FirstName?.trim();
        const p1Last  = row.parent1LastName?.trim();
        if (p1First && p1Last) {
          const existingParents = await this.parentRepo.find({ where: { studentId: student.id } });
          const alreadyExists = existingParents.some(
            p => p.firstName === p1First && p.lastName === p1Last,
          );
          if (!alreadyExists) {
            const parent = this.parentRepo.create({
              firstName: p1First,
              lastName:  p1Last,
              email:     row.parent1Email?.trim() || undefined,
              phone:     row.parent1Phone?.trim() || undefined,
              studentId: student.id,
            });
            await this.parentRepo.save(parent);
          }
        }

        // ── Klasse suchen oder anlegen ──
        const className  = row.className?.trim();
        const schoolYear = row.schoolYear?.trim();

        if (className) {
          const cacheKey = `${className}|${schoolYear ?? ''}`;
          let classId = classCache.get(cacheKey);

          if (!classId) {
            // In DB suchen
            const existing = await this.classRepo.findOne({
              where: { name: className, teacherId, ...(schoolYear ? { schoolYear } : {}) },
            });

            if (existing) {
              classId = existing.id;
            } else {
              // Neu anlegen
              const newCls = this.classRepo.create({
                name:       className,
                schoolYear: schoolYear ?? null,
                teacherId,
                students:   [],
              });
              const saved = await this.classRepo.save(newCls);
              classId = saved.id;
              result.classesCreated++;
            }
            classCache.set(cacheKey, classId);
          }

          // Schüler direkt in Join-Tabelle eintragen (kein Cascade-Save)
          await this.classRepo.query(
            `INSERT INTO class_students ("classId", "studentId")
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [classId, student.id],
          );
        }

      } catch (e) {
        result.skipped++;
        result.errors.push({ row: rowNum, reason: 'Datenbankfehler beim Speichern' });
      }
    }

    return result;
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const student = await this.findOne(id, teacherId);
    await this.studentRepo.remove(student);
  }

}

