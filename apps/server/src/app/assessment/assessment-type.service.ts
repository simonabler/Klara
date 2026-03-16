import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentType } from './assessment-type.entity';
import { AssessmentSchema } from '@app/domain';
import {
  CreateAssessmentTypeDto,
  UpdateAssessmentTypeDto,
  AssessmentTypeDto,
} from '@app/domain';

/** Standard-Typen die jeder Lehrkraft beim ersten Aufruf angelegt werden */
const DEFAULT_TYPES = [
  {
    name: 'Mündliche Überprüfung',
    schema: AssessmentSchema.PLUS_TILDE_MINUS,
    defaultForEventType: 'ORAL_CHECK',
  },
  {
    name: 'Schriftliche Überprüfung',
    schema: AssessmentSchema.PLUS_TILDE_MINUS,
    defaultForEventType: 'WRITTEN_CHECK',
  },
  {
    name: 'Schularbeit',
    schema: AssessmentSchema.GRADES_1_5,
    defaultForEventType: 'EXAM',
  },
];

@Injectable()
export class AssessmentTypeService {
  constructor(
    @InjectRepository(AssessmentType)
    private readonly repo: Repository<AssessmentType>,
  ) {}

  /**
   * Alle AssessmentTypes der Lehrkraft laden.
   * Falls noch keine vorhanden: Standard-Typen anlegen (On-Demand-Init).
   */
  async findAll(teacherId: string): Promise<AssessmentTypeDto[]> {
    let types = await this.repo.find({
      where: { teacherId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });

    if (types.length === 0) {
      types = await this.seedDefaults(teacherId);
    }

    return types.map(t => this.toDto(t));
  }

  async findOne(id: string, teacherId: string): Promise<AssessmentType> {
    const type = await this.repo.findOne({ where: { id, teacherId } });
    if (!type) throw new NotFoundException('Leistungstyp nicht gefunden');
    return type;
  }

  async create(dto: CreateAssessmentTypeDto, teacherId: string): Promise<AssessmentTypeDto> {
    // Sicherstellen dass Standard-Typen existieren
    await this.ensureDefaults(teacherId);
    const entity = this.repo.create({ ...dto, teacherId, isDefault: false });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdateAssessmentTypeDto, teacherId: string): Promise<AssessmentTypeDto> {
    const type = await this.findOne(id, teacherId);
    Object.assign(type, dto);
    const saved = await this.repo.save(type);
    return this.toDto(saved);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const type = await this.findOne(id, teacherId);
    if (type.isDefault) {
      throw new ForbiddenException('Standard-Leistungstypen können nicht gelöscht werden');
    }
    await this.repo.remove(type);
  }

  // ── Interne Hilfsmethoden ──────────────────────────────────────────────────

  private async ensureDefaults(teacherId: string): Promise<void> {
    const count = await this.repo.count({ where: { teacherId } });
    if (count === 0) {
      await this.seedDefaults(teacherId);
    }
  }

  private async seedDefaults(teacherId: string): Promise<AssessmentType[]> {
    const entities = DEFAULT_TYPES.map(t =>
      this.repo.create({
        ...t,
        maxPoints: null,
        weight: null,
        color: null,
        isDefault: true,
        teacherId,
      }),
    );
    return this.repo.save(entities);
  }

  private toDto(t: AssessmentType): AssessmentTypeDto {
    return {
      id:                  t.id,
      name:                t.name,
      schema:              t.schema,
      maxPoints:           t.maxPoints ?? undefined,
      weight:              t.weight    ?? undefined,
      color:               t.color     ?? undefined,
      isDefault:           t.isDefault,
      defaultForEventType: t.defaultForEventType ?? undefined,
    };
  }
}
