import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipMetrics } from './metrics/metrics.decorator';
import { SkipAnomalyGuard } from './metrics/anomaly.guard';

@ApiTags('health')
@Controller()
export class AppController {
  // Health-Checks (Docker, Monitoring) weder zählen noch sperren
  @SkipMetrics()
  @SkipAnomalyGuard()
  @Get('healthz')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ schema: { properties: { status: { type: 'string', example: 'ok' } } } })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
