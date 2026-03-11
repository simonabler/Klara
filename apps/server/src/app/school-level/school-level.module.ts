import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolLevel } from './school-level.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolLevel])],
  exports: [TypeOrmModule],
})
export class SchoolLevelModule {}
