import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimetableService } from './timetable.service';
import {
  CreateTimetableEntryValidationDto,
  UpdateTimetableEntryValidationDto,
} from './timetable-validation.dto';

function currentSchoolYear(): string {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const start = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}

@ApiTags('timetable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private readonly svc: TimetableService) {}

  /** GET /timetable?schoolYear=2025/26 */
  @Get()
  @ApiOperation({ summary: 'Alle Stundenplan-Einträge der Lehrkraft für ein Schuljahr' })
  @ApiQuery({ name: 'schoolYear', required: false, description: 'z.B. 2025/26' })
  findAll(@Query('schoolYear') schoolYear: string, @Req() req: Request) {
    return this.svc.findAll(
      (req.user as any).id,
      schoolYear ?? currentSchoolYear(),
    );
  }

  /** POST /timetable */
  @Post()
  @ApiOperation({ summary: 'Neuen Stundeneintrag anlegen' })
  create(@Body() dto: CreateTimetableEntryValidationDto, @Req() req: Request) {
    return this.svc.create((req.user as any).id, dto);
  }

  /** PUT /timetable/:id */
  @Put(':id')
  @ApiOperation({ summary: 'Stundeneintrag aktualisieren' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTimetableEntryValidationDto,
    @Req() req: Request,
  ) {
    return this.svc.update((req.user as any).id, id, dto);
  }

  /** DELETE /timetable/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stundeneintrag löschen' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.svc.remove((req.user as any).id, id);
  }
}
