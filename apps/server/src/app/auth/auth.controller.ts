import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentTeacher } from './current-teacher.decorator';
import { Teacher } from '../teacher/teacher.entity';
import { JwtPayload } from './jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Leitet zur Google OAuth2 Anmeldeseite weiter.
   */
  @Get('google')
  @ApiOperation({ summary: 'Google OAuth2 Login starten' })
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard übernimmt den Redirect – diese Methode wird nicht erreicht
  }

  /**
   * Google OAuth2 Callback – stellt JWT aus und leitet zum Frontend weiter.
   */
  @Get('google/callback')
  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const teacher = req.user as Teacher;

    const payload: JwtPayload = {
      sub: teacher.id,
      email: teacher.email,
    };

    const token = this.jwtService.sign(payload);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost';

    // Token als HttpOnly-Cookie setzen und zum Frontend weiterleiten
    res.cookie('klara_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 Stunden
    });

    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  /**
   * Gibt das Profil der aktuell eingeloggten Lehrkraft zurück.
   */
  @Get('me')
  @ApiOperation({ summary: 'Profil der eingeloggten Lehrkraft abrufen' })
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentTeacher() teacher: { id: string; email: string; displayName: string }) {
    return teacher;
  }

  /**
   * Logout – löscht den Cookie.
   */
  @Get('logout')
  @ApiOperation({ summary: 'Logout – löscht den Auth-Cookie' })
  @UseGuards(JwtAuthGuard)
  logout(@Res() res: Response) {
    res.clearCookie('klara_token');
    res.json({ message: 'Erfolgreich abgemeldet' });
  }
}
