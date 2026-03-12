import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubjectService } from './subject.service';
import { CreateSubjectValidationDto, UpdateSubjectValidationDto } from '../class/class-validation.dto';

@ApiTags('subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subjects')
export class SubjectController {
  constructor(private readonly service: SubjectService) {}

  @Get()
  @ApiOperation({ summary: 'Alle Fächer der Lehrkraft' })
  findAll(@Req() req: Request) {
    return this.service.findAll((req.user as any).id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.service.findOne(id, (req.user as any).id);
  }

  @Post()
  create(@Body() dto: CreateSubjectValidationDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any).id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectValidationDto, @Req() req: Request) {
    return this.service.update(id, dto, (req.user as any).id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req.user as any).id);
  }
}
