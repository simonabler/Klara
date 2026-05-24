import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../student/student.entity';
import { AssessmentEvent } from './assessment-event.entity';

@Entity('student_results')
export class StudentResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Österreichisches Notensystem 1–5, optional
  @Column({ type: 'int', nullable: true })
  grade: number;

  @Column({ type: 'float', nullable: true })
  points: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => AssessmentEvent, (event) => event.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentEventId' })
  assessmentEvent: AssessmentEvent;

  @Column()
  assessmentEventId: string;

  @ManyToOne(() => Student, (student) => student.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  studentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
