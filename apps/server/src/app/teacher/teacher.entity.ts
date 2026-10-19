import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  googleId: string;

  @Column()
  email: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  /** Notenberechnung mit Gewichtung aktiviert (default: false) */
  @Column({ default: false })
  gradingEnabled: boolean;

  /** Aufbewahrungsdauer in Jahren nach Schuljahresende; null = keine Frist */
  @Column({ type: 'int', nullable: true })
  retentionYears: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
