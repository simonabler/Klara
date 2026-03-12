import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NoteService } from './note.service';
import { CreateNoteDto, NoteFilterDto, UpdateNoteDto } from '@app/domain';
import { NoteType } from '@app/domain';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get()
  @ApiOperation({ summary: 'Notizen abrufen – filterbar nach Schüler, Fach, Typ, Zeitraum' })
  @ApiQuery({ name: 'studentId',  required: false })
  @ApiQuery({ name: 'subjectId',  required: false })
  @ApiQuery({ name: 'type',       required: false, enum: NoteType })
  @ApiQuery({ name: 'from',       required: false, description: 'ISO-Datum' })
  @ApiQuery({ name: 'to',         required: false, description: 'ISO-Datum' })
  findAll(@Query() filter: NoteFilterDto, @Req() req: Request) {
    return this.noteService.findAll((req.user as any).id, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Einzelne Notiz abrufen' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.noteService.findOne(id, (req.user as any).id);
  }

  @Post()
  @ApiOperation({ summary: 'Notiz anlegen' })
  create(@Body() dto: CreateNoteDto, @Req() req: Request) {
    return this.noteService.create(dto, (req.user as any).id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Notiz bearbeiten' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @Req() req: Request,
  ) {
    return this.noteService.update(id, dto, (req.user as any).id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Notiz löschen' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.noteService.remove(id, (req.user as any).id);
  }
}
