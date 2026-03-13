import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from './teacher.entity';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  async findOrCreate(profile: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }): Promise<Teacher> {
    const existing = await this.teacherRepo.findOne({
      where: { googleId: profile.googleId },
    });
    if (existing) return existing;

    const teacher = this.teacherRepo.create(profile);
    return this.teacherRepo.save(teacher);
  }

  async findById(id: string): Promise<Teacher | null> {
    return this.teacherRepo.findOne({ where: { id } });
  }

  /**
   * Löscht die Lehrkraft und – via CASCADE – alle verknüpften Schüler,
   * Notizen, Leistungsereignisse und Ergebnisse.
   */
  async deleteAccount(id: string): Promise<void> {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher) return;
    await this.teacherRepo.remove(teacher);
  }
}
