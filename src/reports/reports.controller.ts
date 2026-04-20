import { Controller, Get } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiSessionAuth()
@ApiForbiddenResponse({ description: 'SUPER_ADMIN only.' })
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @Roles(AppRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reports & analytics', description: 'KPIs, revenue series, and executive metrics.' })
  @ApiResponse({ status: 200, description: 'Analytics payload.' })
  getAnalytics() {
    return this.reportsService.getAnalytics();
  }
}
