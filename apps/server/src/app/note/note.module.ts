import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './note.entity';
import { Class } from '../class/class.entity';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { OwnershipModule } from '../common/ownership.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note, Class]), OwnershipModule],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NoteModule {}
