import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssessmentEventType } from '@app/domain';
import { Teacher } from '../teacher/teacher.entity';
import { Class } from '../class/class.entity';
import { Subject } from '../subject/subject.entity';
import { SchoolLevel } from '../school-level/school-level.entity';
import { StudentResult } from './student-result.entity';

@Entity('assessment_events')
export class AssessmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', default: AssessmentEventType.ORAL_CHECK })
  type: AssessmentEventType;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column()
  teacherId: string;

  @ManyToOne(() => Class, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @Column({ nullable: true })
  classId: string;

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

  @OneToMany(() => StudentResult, (result) => result.assessmentEvent, { cascade: true })
  results: StudentResult[];

  @CreateDateColumn()
  createdAt: Date;
}
