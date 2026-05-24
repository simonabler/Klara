import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableEntry } from './timetable-entry.entity';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TimetableEntry])],
  providers: [TimetableService],
  controllers: [TimetableController],
})
export class TimetableModule {}
