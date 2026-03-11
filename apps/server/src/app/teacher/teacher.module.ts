import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from './teacher.entity';
import { TeacherService } from './teacher.service';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher])],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
