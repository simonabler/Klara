import { Body, Controller, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchoolYearService } from './school-year.service';
import {
  PurgeRequestValidationDto,
  RetentionSettingsValidationDto,
  RolloverRequestValidationDto,
} from './school-year-validation.dto';

@ApiTags('school-year')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('school-year')
export class SchoolYearController {
  constructor(private readonly service: SchoolYearService) {}

  @Post('rollover')
  @ApiOperation({ summary: 'Klassen ins Folgeschuljahr übernehmen (mit allen Schüler/innen)' })
  rollover(@Body() dto: RolloverRequestValidationDto, @Req() req: Request) {
    return this.service.rollover((req.user as any).id, dto);
  }

  @Get('retention')
  @ApiOperation({ summary: 'Aufbewahrungsfrist und zur Löschung fällige Schuljahre' })
  getRetention(@Req() req: Request) {
    return this.service.getRetention((req.user as any).id);
  }

  @Put('retention')
  @ApiOperation({ summary: 'Aufbewahrungsfrist setzen (null = keine Frist)' })
  setRetention(@Body() dto: RetentionSettingsValidationDto, @Req() req: Request) {
    return this.service.setRetention((req.user as any).id, dto.retentionYears);
  }

  @Post('retention/purge')
  @HttpCode(200)
  @ApiOperation({ summary: 'Alle Daten eines fälligen Schuljahres endgültig löschen' })
  purge(@Body() dto: PurgeRequestValidationDto, @Req() req: Request) {
    return this.service.purge((req.user as any).id, dto.schoolYear);
  }
}
