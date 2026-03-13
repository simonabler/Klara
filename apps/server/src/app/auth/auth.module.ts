import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TeacherModule } from '../teacher/teacher.module';
import { Teacher } from '../teacher/teacher.entity';
import { ExportService } from './export.service';
import { Student } from '../student/student.entity';
import { Note } from '../note/note.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { Subject } from '../subject/subject.entity';
import { Class } from '../class/class.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') as any ?? '8h',
        },
      }),
    }),
    TeacherModule,
    TypeOrmModule.forFeature([Student, Note, AssessmentEvent, Subject, Class, Teacher]),
  ],
  controllers: [AuthController],
  providers: [GoogleStrategy, JwtStrategy, JwtAuthGuard, ExportService],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
