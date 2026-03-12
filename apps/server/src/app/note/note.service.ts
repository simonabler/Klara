import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Note } from './note.entity';
import { CreateNoteDto, UpdateNoteDto, NoteFilterDto } from '@app/domain';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  async findAll(teacherId: string, filter: NoteFilterDto): Promise<Note[]> {
    const where: Record<string, unknown> = { teacherId };

    if (filter.studentId)  where['studentId']  = filter.studentId;
    if (filter.subjectId)  where['subjectId']   = filter.subjectId;
    if (filter.type)       where['type']         = filter.type;

    if (filter.from && filter.to) {
      where['createdAt'] = Between(new Date(filter.from), new Date(filter.to));
    } else if (filter.from) {
      where['createdAt'] = MoreThanOrEqual(new Date(filter.from));
    } else if (filter.to) {
      where['createdAt'] = LessThanOrEqual(new Date(filter.to));
    }

    return this.noteRepo.find({
      where,
      relations: ['subject', 'schoolLevel'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, teacherId: string): Promise<Note> {
    const note = await this.noteRepo.findOne({
      where: { id, teacherId },
      relations: ['subject', 'schoolLevel'],
    });
    if (!note) throw new NotFoundException('Notiz nicht gefunden');
    return note;
  }

  async create(dto: CreateNoteDto, teacherId: string): Promise<Note> {
    const note = this.noteRepo.create({
      content:       dto.content,
      type:          dto.type,
      studentId:     dto.studentId,
      subjectId:     dto.subjectId,
      schoolLevelId: dto.schoolLevelId,
      teacherId,
    });
    const saved = await this.noteRepo.save(note);
    return this.findOne(saved.id, teacherId);
  }

  async update(
    id: string,
    dto: UpdateNoteDto,
    teacherId: string,
  ): Promise<Note> {
    const note = await this.findOne(id, teacherId);
    if (dto.content       !== undefined) note.content       = dto.content;
    if (dto.type          !== undefined) note.type          = dto.type;
    if (dto.subjectId     !== undefined) note.subjectId     = dto.subjectId;
    if (dto.schoolLevelId !== undefined) note.schoolLevelId = dto.schoolLevelId;
    await this.noteRepo.save(note);
    return this.findOne(id, teacherId);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const note = await this.noteRepo.findOne({ where: { id } });
    if (!note) throw new NotFoundException('Notiz nicht gefunden');
    if (note.teacherId !== teacherId) throw new ForbiddenException();
    await this.noteRepo.remove(note);
  }
}
