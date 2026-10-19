import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../student/student.entity';
import { Class } from '../class/class.entity';
import { Subject } from '../subject/subject.entity';
import { OwnershipValidationService } from './ownership-validation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Class, Subject])],
  providers: [OwnershipValidationService],
  exports: [OwnershipValidationService],
})
export class OwnershipModule {}
