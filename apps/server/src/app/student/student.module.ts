import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { Parent } from '../parent/parent.entity';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Parent])],
  providers: [StudentService],
  controllers: [StudentController],
  exports: [TypeOrmModule, StudentService],
})
export class StudentModule {}
