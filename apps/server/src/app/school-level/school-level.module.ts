import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolLevel } from './school-level.entity';
import { SchoolLevelService } from './school-level.service';
import { SchoolLevelController } from './school-level.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolLevel])],
  providers: [SchoolLevelService],
  controllers: [SchoolLevelController],
  exports: [TypeOrmModule, SchoolLevelService],
})
export class SchoolLevelModule {}
