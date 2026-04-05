import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiSessionAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary', description: 'Aggregated stats for the admin dashboard.' })
  @ApiResponse({ status: 200, description: 'Summary payload.' })
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
