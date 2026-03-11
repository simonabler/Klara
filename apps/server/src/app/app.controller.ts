import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get('healthz')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ schema: { properties: { status: { type: 'string', example: 'ok' } } } })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
