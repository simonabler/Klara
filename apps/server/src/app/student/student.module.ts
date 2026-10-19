import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { Parent } from '../parent/parent.entity';
import { Class } from '../class/class.entity';
import { Teacher } from '../teacher/teacher.entity';
import { Note } from '../note/note.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { AssessmentType } from '../assessment/assessment-type.entity';
import { StudentService } from './student.service';
import { StudentExportService } from './student-export.service';
import { StudentController } from './student.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Parent, Class, Teacher, Note, StudentResult, AssessmentType])],
  providers: [StudentService, StudentExportService],
  controllers: [StudentController],
  exports: [TypeOrmModule, StudentService],
})
export class StudentModule {}
