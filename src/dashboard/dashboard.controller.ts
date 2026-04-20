import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiSessionAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Dashboard summary',
    description:
      'Aggregated stats for the admin dashboard. Revenue and transaction totals are included only for SUPER_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Summary payload.' })
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSummary(user);
  }

  @Get('reservation-tab-stats')
  @ApiOperation({
    summary: 'Reservation tab counts',
    description:
      'Counts by reservation status, booked room-nights on active stays, and housekeeping-available rooms. Used by the front-desk tabs.',
  })
  @ApiResponse({ status: 200 })
  getReservationTabStats() {
    return this.dashboardService.getReservationTabStats();
  }
}
