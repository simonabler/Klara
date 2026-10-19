import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AVATAR_URL_PREFIX } from '../common/avatar-files';
import { avatarUploadDir } from './avatar-storage.service';
import { Student } from './student.entity';

/** Seit dem Bereinigungsskript heißen alle Avatare <uuid>.webp */
const AVATAR_FILE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

/**
 * Liefert Schülerfotos aus – nur mit gültigem Login und nur, wenn ein Schüler
 * der angemeldeten Lehrkraft genau dieses Bild hat. Die URL bleibt
 * /api/uploads/avatars/<datei>, damit gespeicherte avatarUrl-Werte gültig bleiben.
 * Der Browser schickt das httpOnly-Cookie bei <img>-Requests (same-origin) mit.
 */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('uploads/avatars')
export class AvatarController {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>
  ) {}

  @Get(':file')
  async getAvatar(
    @Param('file') file: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    if (!AVATAR_FILE.test(file)) throw new NotFoundException();

    const owned = await this.studentRepo.exists({
      where: {
        avatarUrl: `${AVATAR_URL_PREFIX}${file}`,
        teacherId: (req.user as any).id,
      },
    });
    // 404 statt 403: verrät nicht, ob das Bild bei einer anderen Lehrkraft existiert
    if (!owned) throw new NotFoundException();

    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
      // Immer neu prüfen (304 per ETag) – kein Foto bleibt nach dem Logout im Cache gültig
      'Cache-Control': 'private, no-cache',
    });
    res.sendFile(file, { root: avatarUploadDir(), dotfiles: 'deny' }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
