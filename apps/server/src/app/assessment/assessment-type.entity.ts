import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssessmentSchema } from '@app/domain';
import { Teacher } from '../teacher/teacher.entity';

@Entity('assessment_types')
export class AssessmentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: AssessmentSchema.GRADES_1_5 })
  schema: AssessmentSchema;

  /** Nur relevant für Schema POINTS: maximale Punktezahl */
  @Column({ type: 'float', nullable: true })
  maxPoints: number | null;

  /** Gewichtung für Notenberechnung (optional) */
  @Column({ type: 'float', nullable: true })
  weight: number | null;

  /** Hex-Farbe für visuelle Kennzeichnung in der Tabellenansicht */
  @Column({ nullable: true })
  color: string | null;

  /** true = Standard-Typ (ORAL_CHECK, WRITTEN_CHECK, EXAM) – nicht löschbar */
  @Column({ default: false })
  isDefault: boolean;

  /**
   * Verknüpfung zum alten AssessmentEventType-Enum für Standardtypen.
   * z.B. 'ORAL_CHECK', 'WRITTEN_CHECK', 'EXAM'
   */
  @Column({ nullable: true })
  defaultForEventType: string | null;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column()
  teacherId: string;
}
