import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RepeatType, WeekVariant } from '@app/domain';
import { Teacher } from '../teacher/teacher.entity';
import { Subject } from '../subject/subject.entity';
import { Class } from '../class/class.entity';

@Entity('timetable_entries')
export class TimetableEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column()
  teacherId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column()
  subjectId: string;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @Column()
  classId: string;

  /** 1 = Montag … 5 = Freitag */
  @Column({ type: 'int' })
  dayOfWeek: number;

  /** Unterrichtsstunden-Nummer (1–10) */
  @Column({ type: 'int' })
  period: number;

  @Column({ nullable: true })
  room: string | null;

  @Column({ type: 'varchar', default: RepeatType.WEEKLY })
  repeatType: RepeatType;

  /** Nur bei BIWEEKLY: 'A' | 'B' | 'BOTH' */
  @Column({ type: 'varchar', nullable: true })
  weekVariant: WeekVariant | null;

  /** Nur bei SEMESTER: 1 | 2 */
  @Column({ type: 'int', nullable: true })
  semester: number | null;

  /** Nur bei ONCE: konkretes Datum */
  @Column({ type: 'date', nullable: true })
  onceDate: Date | null;

  /** Optionaler Gültigkeitsstart */
  @Column({ type: 'date', nullable: true })
  validFrom: Date | null;

  /** Optionales Gültigkeitsende */
  @Column({ type: 'date', nullable: true })
  validTo: Date | null;

  /** Hex-Farbe für die Darstellung im Stundenplan, z.B. '#5B8AC0' */
  @Column({ nullable: true })
  color: string | null;

  /** Schuljahr, z.B. '2025/26' */
  @Column()
  schoolYear: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
