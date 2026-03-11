import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentEvent, StudentResult])],
  exports: [TypeOrmModule],
})
export class AssessmentModule {}
