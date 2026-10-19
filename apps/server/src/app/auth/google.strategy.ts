import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import type { StateStore } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { TeacherService } from '../teacher/teacher.service';
import { OAuthCookieStateStore } from './oauth-state.store';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly teacherService: TeacherService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
      // Schutz gegen Login-CSRF: state pro Login-Vorgang, geprüft im Callback.
      // Cast: die Typen deklarieren Überladungen, passport wählt zur Laufzeit
      // anhand der Parameteranzahl (store: 3, verify: 4) – siehe oauth-state.store.spec.ts
      store: new OAuthCookieStateStore() as unknown as StateStore,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value ?? '';
    const avatarUrl = profile.photos?.[0]?.value ?? '';

    const teacher = await this.teacherService.findOrCreate({
      googleId: profile.id,
      email,
      displayName: profile.displayName,
      avatarUrl,
    });

    done(null, teacher);
  }
}
