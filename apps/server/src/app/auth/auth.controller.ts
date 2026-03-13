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
import { TeacherService } from '../teacher/teacher.service';
import { JwtPayload } from './jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly teacherService: TeacherService,
  ) {}

  /**
   * Demo-Login – erstellt oder findet einen festen Demo-User und gibt ein JWT zurück.
   * Nur außerhalb von Produktion aktiv.
   */
  @Get('demo')
  @ApiOperation({ summary: 'Demo-Login (nur in Entwicklung)' })
  async demoLogin(@Res() res: Response) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Demo-Login ist in der Produktion nicht verfügbar');
    }

    const teacher = await this.teacherService.findOrCreate({
      googleId: 'demo-user',
      email: 'demo@klara.local',
      displayName: 'Demo Lehrkraft',
      avatarUrl: undefined,
    });

    const payload: JwtPayload = { sub: teacher.id, email: teacher.email };
    const token = this.jwtService.sign(payload);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';

    // Token nur als httpOnly-Cookie – NICHT als URL-Parameter
    res.cookie('klara_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.redirect(`${frontendUrl}/auth/callback`);
  }

  /**
   * Leitet zur Google OAuth2 Anmeldeseite weiter.
   */
  @Get('google')
  @ApiOperation({ summary: 'Google OAuth2 Login starten' })
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard übernimmt den Redirect
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
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';

    res.cookie('klara_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.redirect(`${frontendUrl}/auth/callback`);
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
