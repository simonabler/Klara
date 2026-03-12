import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';
import { Student } from '../student/student.entity';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentEvent, StudentResult, Student])],
  providers: [AssessmentService],
  controllers: [AssessmentController],
  exports: [AssessmentService],
})
export class AssessmentModule {}
