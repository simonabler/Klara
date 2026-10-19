import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Student } from '../student/student.entity';
import { Class } from '../class/class.entity';
import { Subject } from '../subject/subject.entity';

/** Fremdschlüssel aus einem Request, die vor dem Schreiben geprüft werden */
export interface OwnedRefs {
  studentIds?: (string | null | undefined)[];
  classId?: string | null;
  subjectId?: string | null;
}

/**
 * Prüft vor jedem Schreiben, dass referenzierte Schüler, Klassen und Fächer
 * der angemeldeten Lehrkraft gehören (Mandantentrennung über `teacherId`).
 *
 * Fremde und nicht existierende IDs ergeben dieselbe Antwort (403), damit sich
 * nicht ausprobieren lässt, welche UUIDs es gibt. Leere Werte (`null`/`undefined`)
 * werden übersprungen – optionale Verknüpfungen bleiben damit optional.
 */
@Injectable()
export class OwnershipValidationService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>
  ) {}

  async assertOwned(teacherId: string, refs: OwnedRefs): Promise<void> {
    await this.assertStudents(teacherId, refs.studentIds ?? []);
    if (refs.classId) await this.assertClass(teacherId, refs.classId);
    if (refs.subjectId) await this.assertSubject(teacherId, refs.subjectId);
  }

  async assertStudents(
    teacherId: string,
    studentIds: (string | null | undefined)[]
  ): Promise<void> {
    const ids = [...new Set(studentIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return;
    const owned = await this.studentRepo.count({
      where: { id: In(ids), teacherId },
    });
    if (owned !== ids.length)
      throw new ForbiddenException('Ungültige Schülerzuweisung');
  }

  async assertClass(teacherId: string, classId: string): Promise<void> {
    const exists = await this.classRepo.exists({
      where: { id: classId, teacherId },
    });
    if (!exists) throw new ForbiddenException('Ungültige Klasse');
  }

  async assertSubject(teacherId: string, subjectId: string): Promise<void> {
    const exists = await this.subjectRepo.exists({
      where: { id: subjectId, teacherId },
    });
    if (!exists) throw new ForbiddenException('Ungültiges Fach');
  }
}
