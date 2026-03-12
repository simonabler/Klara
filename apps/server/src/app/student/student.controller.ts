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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudentService } from './student.service';
import { BulkImportStudentsDto } from '@app/domain';
import { CreateStudentValidationDto, UpdateStudentValidationDto } from './student-validation.dto';
import { avatarUploadOptions } from './avatar-upload.config';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiOperation({ summary: 'Alle Schüler der eingeloggten Lehrkraft' })
  findAll(@Req() req: Request) {
    return this.studentService.findAll((req.user as any).id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Schülerprofil abrufen' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.studentService.findOne(id, (req.user as any).id);
  }

  @Post()
  @ApiOperation({ summary: 'Schüler anlegen' })
  create(@Body() dto: CreateStudentValidationDto, @Req() req: Request) {
    return this.studentService.create(dto, (req.user as any).id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Schülerdaten bearbeiten' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentValidationDto,
    @Req() req: Request,
  ) {
    return this.studentService.update(id, dto, (req.user as any).id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Schüler per CSV-Daten importieren (Bulk)' })
  bulkImport(@Body() dto: BulkImportStudentsDto, @Req() req: Request) {
    return this.studentService.bulkImport(dto.rows, (req.user as any).id);
  }

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Profilbild hochladen' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', avatarUploadOptions))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${file.filename}`;
    return this.studentService.updateAvatar(id, (req.user as any).id, avatarUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Schüler löschen' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.studentService.remove(id, (req.user as any).id);
  }
}
