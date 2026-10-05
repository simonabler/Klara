import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { SkipMetrics } from './metrics.decorator';
import { BlocklistService } from './blocklist.service';
import { MetricsTokenGuard } from './metrics-token.guard';
import { UnbanValidationDto } from './unban-validation.dto';
import { normalizeIp } from './client-ip';

/**
 * Betriebs-Endpunkte unter `/api/_stats`.
 * Nur mit gültigem Token im Header `X-Metrics-Token` erreichbar (siehe MetricsTokenGuard).
 */
@ApiExcludeController()
@UseGuards(MetricsTokenGuard)
@SkipMetrics()
@Controller('_stats')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly blocklist: BlocklistService,
  ) {}

  @Get()
  getStats() {
    return this.metrics.snapshot();
  }

  @Post('reset')
  @HttpCode(200)
  async reset() {
    await this.metrics.reset();
    return { ok: true };
  }

  @Get('security')
  security() {
    return { blocked: this.blocklist.list() };
  }

  @Post('security/unban')
  @HttpCode(200)
  unban(@Body() dto: UnbanValidationDto) {
    return { ok: this.blocklist.unban(normalizeIp(dto.ip)) };
  }
}
