import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Teacher } from '../teacher/teacher.entity';
import { Student } from '../student/student.entity';
import { Parent } from '../parent/parent.entity';
import { Class } from '../class/class.entity';
import { Subject } from '../subject/subject.entity';
import { SchoolLevel } from '../school-level/school-level.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { StudentResult } from '../assessment/student-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Teacher,
      Student,
      Parent,
      Class,
      Subject,
      SchoolLevel,
      Note,
      AssessmentEvent,
      StudentResult,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
