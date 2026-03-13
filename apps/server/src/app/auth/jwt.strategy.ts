import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TeacherService } from '../teacher/teacher.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly teacherService: TeacherService,
  ) {
    super({
      // Token aus Bearer-Header ODER httpOnly-Cookie akzeptieren
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.['klara_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    const teacher = await this.teacherService.findById(payload.sub);
    if (!teacher) {
      throw new UnauthorizedException();
    }
    return { id: teacher.id, email: teacher.email, displayName: teacher.displayName };
  }
}
