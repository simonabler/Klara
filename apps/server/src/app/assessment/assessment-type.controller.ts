import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssessmentTypeService } from './assessment-type.service';
import {
  CreateAssessmentTypeValidationDto,
  UpdateAssessmentTypeValidationDto,
} from './assessment-type-validation.dto';

@ApiTags('assessment-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment-types')
export class AssessmentTypeController {
  constructor(private readonly service: AssessmentTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Alle Leistungstypen der Lehrkraft' })
  findAll(@Req() req: Request) {
    return this.service.findAll((req.user as any).id);
  }

  @Post()
  @ApiOperation({ summary: 'Neuen Leistungstyp anlegen' })
  create(@Body() dto: CreateAssessmentTypeValidationDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any).id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Leistungstyp bearbeiten' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentTypeValidationDto,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, (req.user as any).id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Leistungstyp löschen (nur eigene, nicht Standard)' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req.user as any).id);
  }
}
