import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './class.entity';
import { Student } from '../student/student.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Class, Student, AssessmentEvent, StudentResult])],
  providers: [ClassService],
  controllers: [ClassController],
  exports: [TypeOrmModule, ClassService],
})
export class ClassModule {}
