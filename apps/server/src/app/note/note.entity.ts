import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NoteType } from '@app/domain';
import { Teacher } from '../teacher/teacher.entity';
import { Student } from '../student/student.entity';
import { Subject } from '../subject/subject.entity';
import { SchoolLevel } from '../school-level/school-level.entity';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: NoteType.GENERAL })
  type: NoteType;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column()
  teacherId: string;

  @ManyToOne(() => Student, (student) => student.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  studentId: string;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ nullable: true })
  subjectId: string;

  @ManyToOne(() => SchoolLevel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schoolLevelId' })
  schoolLevel: SchoolLevel;

  @Column({ nullable: true })
  schoolLevelId: string;

  @CreateDateColumn()
  createdAt: Date;
}
