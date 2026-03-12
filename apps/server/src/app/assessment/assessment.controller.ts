import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssessmentService } from './assessment.service';
import {
  CreateAssessmentEventValidationDto,
  UpdateAssessmentEventValidationDto,
  UpsertStudentResultValidationDto,
  BulkUpsertResultsValidationDto,
  AssignStudentsValidationDto,
} from './assessment-validation.dto';

@ApiTags('assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}

  // ── Events ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Alle Leistungsereignisse der Lehrkraft' })
  findAll(
    @Req() req: Request,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.findAllEvents((req.user as any).id, classId, subjectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.service.findOneEvent(id, (req.user as any).id);
  }

  @Post()
  create(@Body() dto: CreateAssessmentEventValidationDto, @Req() req: Request) {
    return this.service.createEvent(dto, (req.user as any).id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssessmentEventValidationDto, @Req() req: Request) {
    return this.service.updateEvent(id, dto, (req.user as any).id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.removeEvent(id, (req.user as any).id);
  }

  // ── Schülerzuweisung ─────────────────────────────────────────────────────

  @Put(':id/students')
  @ApiOperation({ summary: 'Schüler einem Event zuweisen (ersetzt bestehende Zuweisung)' })
  assignStudents(
    @Param('id') id: string,
    @Body() dto: AssignStudentsValidationDto,
    @Req() req: Request,
  ) {
    return this.service.assignStudents(id, dto.studentIds, (req.user as any).id);
  }

  // ── Ergebnisse ───────────────────────────────────────────────────────────

  @Put(':id/results/:studentId')
  @ApiOperation({ summary: 'Ergebnis eines Schülers speichern (upsert)' })
  upsertResult(
    @Param('id') eventId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpsertStudentResultValidationDto,
    @Req() req: Request,
  ) {
    return this.service.upsertResult(eventId, { ...dto, studentId }, (req.user as any).id);
  }

  @Get('student/:studentId/results')
  @ApiOperation({ summary: 'Alle Ergebnisse eines Schülers' })
  getStudentResults(@Param('studentId') studentId: string, @Req() req: Request) {
    return this.service.findResultsForStudent(studentId, (req.user as any).id);
  }

  @Put(':id/results')
  @ApiOperation({ summary: 'Ergebnisse für mehrere Schüler auf einmal speichern' })
  bulkUpsertResults(
    @Param('id') eventId: string,
    @Body() dto: BulkUpsertResultsValidationDto,
    @Req() req: Request,
  ) {
    return this.service.bulkUpsertResults(eventId, dto.results, (req.user as any).id);
  }
}
