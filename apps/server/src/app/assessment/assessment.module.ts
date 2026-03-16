import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';
import { AssessmentType } from './assessment-type.entity';
import { Student } from '../student/student.entity';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AssessmentTypeService } from './assessment-type.service';
import { AssessmentTypeController } from './assessment-type.controller';
import { TeacherModule } from '../teacher/teacher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssessmentEvent, StudentResult, AssessmentType, Student]),
    TeacherModule,
  ],
  providers: [AssessmentService, AssessmentTypeService],
  controllers: [AssessmentController, AssessmentTypeController],
  exports: [AssessmentService, AssessmentTypeService],
})
export class AssessmentModule {}
