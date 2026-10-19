import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../teacher/teacher.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { SchoolYearService } from './school-year.service';
import { SchoolYearController } from './school-year.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, Class, Note, AssessmentEvent])],
  providers: [SchoolYearService],
  controllers: [SchoolYearController],
})
export class SchoolYearModule {}
