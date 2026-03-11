import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Teacher } from '../teacher/teacher.entity';
import { Student } from '../student/student.entity';
import { Parent } from '../parent/parent.entity';
import { Class } from '../class/class.entity';
import { Subject } from '../subject/subject.entity';
import { SchoolLevel } from '../school-level/school-level.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { NoteType, AssessmentEventType } from '@app/domain';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(Class) private readonly classRepo: Repository<Class>,
    @InjectRepository(Subject) private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(SchoolLevel) private readonly schoolLevelRepo: Repository<SchoolLevel>,
    @InjectRepository(Note) private readonly noteRepo: Repository<Note>,
    @InjectRepository(AssessmentEvent) private readonly assessmentRepo: Repository<AssessmentEvent>,
    @InjectRepository(StudentResult) private readonly resultRepo: Repository<StudentResult>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('NODE_ENV') === 'production') return;

    const existingTeacher = await this.teacherRepo.findOne({ where: { email: 'demo@klara.dev' } });
    if (existingTeacher) {
      this.logger.log('Seed already present – skipping');
      return;
    }

    this.logger.log('Seeding development data…');

    // Teacher
    const teacher = await this.teacherRepo.save(
      this.teacherRepo.create({
        googleId: 'seed-google-id',
        email: 'demo@klara.dev',
        displayName: 'Demo Lehrkraft',
        avatarUrl: '',
      }),
    );

    // SchoolLevel
    const schoolLevel = await this.schoolLevelRepo.save(
      this.schoolLevelRepo.create({ name: '3. Klasse', year: '2024/25', teacherId: teacher.id }),
    );

    // Subjects
    const [mathe, deutsch] = await this.subjectRepo.save([
      this.subjectRepo.create({ name: 'Mathematik', teacherId: teacher.id }),
      this.subjectRepo.create({ name: 'Deutsch', teacherId: teacher.id }),
    ]);

    // Students
    const studentData = [
      { firstName: 'Anna', lastName: 'Muster', dateOfBirth: new Date('2014-03-12') },
      { firstName: 'Ben', lastName: 'Huber', dateOfBirth: new Date('2014-07-05') },
      { firstName: 'Clara', lastName: 'Steiner', dateOfBirth: new Date('2013-11-22') },
      { firstName: 'David', lastName: 'Wolf', dateOfBirth: new Date('2014-01-30') },
    ];

    const students = await this.studentRepo.save(
      studentData.map((s) => this.studentRepo.create({ ...s, teacherId: teacher.id })),
    );

    // Parents
    await this.parentRepo.save([
      this.parentRepo.create({ firstName: 'Maria', lastName: 'Muster', email: 'maria.muster@example.com', studentId: students[0].id }),
      this.parentRepo.create({ firstName: 'Josef', lastName: 'Huber', phone: '+43 664 1234567', studentId: students[1].id }),
      this.parentRepo.create({ firstName: 'Eva', lastName: 'Steiner', email: 'eva.steiner@example.com', studentId: students[2].id }),
    ]);

    // Class
    const klasse = await this.classRepo.save(
      this.classRepo.create({
        name: '3A',
        teacherId: teacher.id,
        schoolLevelId: schoolLevel.id,
        students,
      }),
    );

    // Notes
    await this.noteRepo.save([
      this.noteRepo.create({ content: 'Sehr aktive Mitarbeit, stellt gute Fragen.', type: NoteType.PARTICIPATION, teacherId: teacher.id, studentId: students[0].id, subjectId: mathe.id, schoolLevelId: schoolLevel.id }),
      this.noteRepo.create({ content: 'Hat Schwierigkeiten bei Textaufgaben.', type: NoteType.PARTICIPATION, teacherId: teacher.id, studentId: students[1].id, subjectId: mathe.id, schoolLevelId: schoolLevel.id }),
      this.noteRepo.create({ content: 'Verhält sich respektvoll, hilft Mitschülern.', type: NoteType.BEHAVIOUR, teacherId: teacher.id, studentId: students[0].id, subjectId: deutsch.id, schoolLevelId: schoolLevel.id }),
    ]);

    // AssessmentEvent
    const exam = await this.assessmentRepo.save(
      this.assessmentRepo.create({
        title: 'Schularbeit Mathematik 1',
        type: AssessmentEventType.EXAM,
        date: new Date('2025-03-10'),
        teacherId: teacher.id,
        classId: klasse.id,
        subjectId: mathe.id,
        schoolLevelId: schoolLevel.id,
      }),
    );

    // StudentResults
    await this.resultRepo.save([
      this.resultRepo.create({ assessmentEventId: exam.id, studentId: students[0].id, grade: 1, points: 48, comment: 'Ausgezeichnet' }),
      this.resultRepo.create({ assessmentEventId: exam.id, studentId: students[1].id, grade: 3, points: 32 }),
      this.resultRepo.create({ assessmentEventId: exam.id, studentId: students[2].id, grade: 2, points: 42 }),
      this.resultRepo.create({ assessmentEventId: exam.id, studentId: students[3].id, grade: 4, points: 24, comment: 'Förderbedarf' }),
    ]);

    this.logger.log('Seed complete ✓');
  }
}
