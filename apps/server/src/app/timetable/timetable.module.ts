import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableEntry } from './timetable-entry.entity';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';
import { OwnershipModule } from '../common/ownership.module';

@Module({
  imports: [TypeOrmModule.forFeature([TimetableEntry]), OwnershipModule],
  providers: [TimetableService],
  controllers: [TimetableController],
})
export class TimetableModule {}
