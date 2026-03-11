import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { Parent } from '../parent/parent.entity';
import { CreateStudentDto, ImportStudentRowDto, ImportResultDto, UpdateStudentDto } from '@app/domain';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepo: Repository<Parent>,
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
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
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
      student.dateOfBirth = new Date(dto.dateOfBirth);

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
    const result: ImportResultDto = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const firstName = row.firstName?.trim();
      const lastName = row.lastName?.trim();

      if (!firstName || !lastName) {
        result.skipped++;
        result.errors.push({ row: rowNum, reason: 'Vor- und Nachname sind Pflichtfelder' });
        continue;
      }

      try {
        const student = this.studentRepo.create({
          firstName,
          lastName,
          dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
          teacherId,
        });
        const saved = await this.studentRepo.save(student);

        const p1First = row.parent1FirstName?.trim();
        const p1Last = row.parent1LastName?.trim();
        if (p1First && p1Last) {
          const parent = this.parentRepo.create({
            firstName: p1First,
            lastName: p1Last,
            email: row.parent1Email?.trim() || undefined,
            phone: row.parent1Phone?.trim() || undefined,
            studentId: saved.id,
          });
          await this.parentRepo.save(parent);
        }

        result.imported++;
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
