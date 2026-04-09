import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiSessionAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Reports & analytics', description: 'KPIs, revenue series, and executive metrics.' })
  @ApiResponse({ status: 200, description: 'Analytics payload.' })
  getAnalytics() {
    return this.reportsService.getAnalytics();
  }
}
