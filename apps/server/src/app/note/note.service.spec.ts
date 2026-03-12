import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { NoteService } from './note.service';
import { Note } from './note.entity';
import { NoteType } from '@app/domain';

const TEACHER_ID = 'teacher-uuid';
const STUDENT_ID = 'student-uuid';
const SUBJECT_ID = 'subject-uuid';
const NOTE_ID    = 'note-uuid';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id:            NOTE_ID,
    content:       'Zeigt gute Mitarbeit',
    type:          NoteType.PARTICIPATION,
    teacherId:     TEACHER_ID,
    teacher:       null,
    studentId:     STUDENT_ID,
    student:       null,
    subjectId:     null,
    subject:       null,
    classId: null,
    schoolLevel:   null,
    createdAt:     new Date('2026-03-10T10:00:00Z'),
    ...overrides,
  } as Note;
}

describe('NoteService', () => {
  let service: NoteService;
  let noteRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteService,
        {
          provide: getRepositoryToken(Note),
          useValue: {
            find:    jest.fn(),
            findOne: jest.fn(),
            create:  jest.fn(),
            save:    jest.fn(),
            remove:  jest.fn(),
          },
        },
      ],
    }).compile();

    service  = module.get<NoteService>(NoteService);
    noteRepo = module.get(getRepositoryToken(Note));
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all notes for a teacher without filter', async () => {
      const notes = [makeNote()];
      noteRepo.find.mockResolvedValue(notes);

      const result = await service.findAll(TEACHER_ID, {});

      expect(result).toHaveLength(1);
      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teacherId: TEACHER_ID },
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('should filter by studentId', async () => {
      noteRepo.find.mockResolvedValue([makeNote()]);
      await service.findAll(TEACHER_ID, { studentId: STUDENT_ID });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId: STUDENT_ID }),
        }),
      );
    });

    it('should filter by subjectId', async () => {
      noteRepo.find.mockResolvedValue([]);
      await service.findAll(TEACHER_ID, { subjectId: SUBJECT_ID });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subjectId: SUBJECT_ID }),
        }),
      );
    });

    it('should filter by type', async () => {
      noteRepo.find.mockResolvedValue([]);
      await service.findAll(TEACHER_ID, { type: NoteType.BEHAVIOUR });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: NoteType.BEHAVIOUR }),
        }),
      );
    });

    it('should apply date range filter when both from and to are provided', async () => {
      noteRepo.find.mockResolvedValue([]);
      const from = '2026-03-01';
      const to   = '2026-03-31';

      await service.findAll(TEACHER_ID, { from, to });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: Between(new Date(from), new Date(to)),
          }),
        }),
      );
    });

    it('should apply MoreThanOrEqual when only from is provided', async () => {
      noteRepo.find.mockResolvedValue([]);
      const from = '2026-03-01';

      await service.findAll(TEACHER_ID, { from });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: MoreThanOrEqual(new Date(from)),
          }),
        }),
      );
    });

    it('should apply LessThanOrEqual when only to is provided', async () => {
      noteRepo.find.mockResolvedValue([]);
      const to = '2026-03-31';

      await service.findAll(TEACHER_ID, { to });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: LessThanOrEqual(new Date(to)),
          }),
        }),
      );
    });

    it('should combine multiple filter criteria', async () => {
      noteRepo.find.mockResolvedValue([]);
      await service.findAll(TEACHER_ID, {
        studentId: STUDENT_ID,
        type:      NoteType.GENERAL,
      });

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teacherId: TEACHER_ID,
            studentId: STUDENT_ID,
            type:      NoteType.GENERAL,
          }),
        }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a note by id', async () => {
      noteRepo.findOne.mockResolvedValue(makeNote());
      const result = await service.findOne(NOTE_ID, TEACHER_ID);
      expect(result.id).toBe(NOTE_ID);
      expect(noteRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: NOTE_ID, teacherId: TEACHER_ID },
        }),
      );
    });

    it('should throw NotFoundException if note not found', async () => {
      noteRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id', TEACHER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a note', async () => {
      const dto = {
        content:   'Gute Mitarbeit heute',
        type:      NoteType.PARTICIPATION,
        studentId: STUDENT_ID,
      };
      const created = makeNote({ content: dto.content });

      noteRepo.create.mockReturnValue(created);
      noteRepo.save.mockResolvedValue(created);
      noteRepo.findOne.mockResolvedValue(created);

      const result = await service.create(dto, TEACHER_ID);

      expect(result.content).toBe('Gute Mitarbeit heute');
      expect(noteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content:   dto.content,
          type:      dto.type,
          studentId: dto.studentId,
          teacherId: TEACHER_ID,
        }),
      );
      expect(noteRepo.save).toHaveBeenCalled();
    });

    it('should persist optional subjectId and classId', async () => {
      const dto = {
        content:       'Verhalten in Mathe',
        type:          NoteType.BEHAVIOUR,
        studentId:     STUDENT_ID,
        subjectId:     SUBJECT_ID,
        classId: 'class-uuid',
      };
      const created = makeNote({ subjectId: SUBJECT_ID });
      noteRepo.create.mockReturnValue(created);
      noteRepo.save.mockResolvedValue(created);
      noteRepo.findOne.mockResolvedValue(created);

      await service.create(dto, TEACHER_ID);

      expect(noteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId:     SUBJECT_ID,
          classId: 'class-uuid',
        }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update content and type of a note', async () => {
      const existing = makeNote();
      const updated  = makeNote({ content: 'Aktualisiert', type: NoteType.GENERAL });

      // findOne called twice: once for access check, once after save
      noteRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      noteRepo.save.mockResolvedValue(updated);

      const result = await service.update(
        NOTE_ID,
        { content: 'Aktualisiert', type: NoteType.GENERAL },
        TEACHER_ID,
      );

      expect(result.content).toBe('Aktualisiert');
      expect(result.type).toBe(NoteType.GENERAL);
      expect(noteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Aktualisiert', type: NoteType.GENERAL }),
      );
    });

    it('should throw NotFoundException if note does not exist', async () => {
      noteRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(NOTE_ID, { content: 'x' }, TEACHER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only update provided fields (partial update)', async () => {
      const existing = makeNote();
      noteRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, content: 'Nur Text geändert' });
      noteRepo.save.mockResolvedValue(existing);

      await service.update(NOTE_ID, { content: 'Nur Text geändert' }, TEACHER_ID);

      // type should be unchanged (PARTICIPATION from makeNote)
      expect(noteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: NoteType.PARTICIPATION }),
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a note belonging to the teacher', async () => {
      noteRepo.findOne.mockResolvedValue(makeNote());
      noteRepo.remove.mockResolvedValue(undefined);

      await service.remove(NOTE_ID, TEACHER_ID);

      expect(noteRepo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: NOTE_ID }),
      );
    });

    it('should throw NotFoundException if note does not exist', async () => {
      noteRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(NOTE_ID, TEACHER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if note belongs to another teacher', async () => {
      noteRepo.findOne.mockResolvedValue(makeNote({ teacherId: 'other-teacher' }));
      await expect(service.remove(NOTE_ID, TEACHER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
