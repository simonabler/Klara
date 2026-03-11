import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '../teacher/teacher.entity';
import { Parent } from '../parent/parent.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { StudentResult } from '../assessment/student-result.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  avatarUrl: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column()
  teacherId: string;

  @OneToMany(() => Parent, (parent) => parent.student, { cascade: true })
  parents: Parent[];

  @ManyToMany(() => Class, (cls) => cls.students)
  classes: Class[];

  @OneToMany(() => Note, (note) => note.student)
  notes: Note[];

  @OneToMany(() => StudentResult, (result) => result.student)
  results: StudentResult[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
