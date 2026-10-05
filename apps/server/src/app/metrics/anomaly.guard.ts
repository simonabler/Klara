import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BlocklistService } from './blocklist.service';
import { allowlistFromEnv, getClientIp, isExemptIp } from './client-ip';

export const SKIP_SECURITY = 'skip_security';
export const SkipAnomalyGuard = () => SetMetadata(SKIP_SECURITY, true);

@Injectable()
export class AnomalyGuard implements CanActivate {
  private readonly allowlist = allowlistFromEnv();

  constructor(private readonly blocklist: BlocklistService, private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.get<boolean>(SKIP_SECURITY, context.getHandler()) ||
                 this.reflector.get<boolean>(SKIP_SECURITY, context.getClass());
    if (skip) return true;

    const ip = getClientIp(context.switchToHttp().getRequest());
    if (isExemptIp(ip, this.allowlist)) return true;

    const res = this.blocklist.isBlocked(ip);
    if (res.blocked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Temporarily blocked due to anomalous activity',
          reason: res.entry?.reason,
          remainingMs: res.remainingMs,
          strikes: res.entry?.strikes,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
