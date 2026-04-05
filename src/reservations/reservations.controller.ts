import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { AvailabilitySearchResponseDto } from './dto/availability-search-response.dto';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Get('availability')
  @ApiOperation({
    summary: 'Search availability',
    description:
      'Query: `checkInDate`, `checkOutDate` (YYYY-MM-DD), optional `roomsRequested` (1–5). Returns `roomTypes` plus `meta` (includes `hint` when nothing matches). No auth.',
  })
  @ApiOkResponse({ type: AvailabilitySearchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid date range or params.' })
  searchAvailability(@Query() dto: SearchAvailabilityDto) {
    return this.reservationsService.searchAvailability(dto);
  }

  @Public()
  @Post('public')
  @ApiOperation({
    summary: 'Create reservation (public)',
    description:
      'Guest-facing booking. No auth. When PayTabs is configured (`PAYTABS_*` + `API_PUBLIC_URL`), **withPayment: true** is required and the response may include **payment.redirectUrl**. Staff-created reservations use **POST /reservations** (auth) and may omit payment.',
  })
  @ApiResponse({ status: 201, description: 'Reservation created.' })
  @ApiResponse({ status: 400, description: 'Validation or availability error.' })
  createPublicReservation(@Body() dto: CreatePublicReservationDto) {
    return this.reservationsService.createPublicReservation(dto);
  }

  @Post()
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN or STAFF only.' })
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Create reservation (staff)', description: 'Same body as public; records staff user id for audit.' })
  @ApiResponse({ status: 201, description: 'Reservation created.' })
  createInternalReservation(@Body() dto: CreatePublicReservationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.createPublicReservation(dto, user.sub);
  }

  @Get()
  @ApiSessionAuth()
  @ApiOperation({ summary: 'List reservations', description: 'Optional query: status (ReservationStatus enum).' })
  @ApiResponse({ status: 200, description: 'Array of reservations.' })
  listReservations(@Query() filters: ListReservationsDto) {
    return this.reservationsService.listReservations(filters);
  }

  @Get(':id')
  @ApiSessionAuth()
  @ApiOperation({ summary: 'Get reservation by id' })
  @ApiParam({ name: 'id', description: 'Reservation id (cuid)' })
  @ApiResponse({ status: 200, description: 'Reservation with guest and rooms.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  getReservationById(@Param('id') id: string) {
    return this.reservationsService.getReservationById(id);
  }

  @Patch(':id/check-in')
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN or STAFF only.' })
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Check in reservation' })
  @ApiParam({ name: 'id', description: 'Reservation id (cuid)' })
  @ApiResponse({ status: 200, description: 'Reservation checked in; rooms set OCCUPIED.' })
  checkIn(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.checkIn(id, user.sub);
  }

  @Patch(':id/check-out')
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN or STAFF only.' })
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Check out reservation' })
  @ApiParam({ name: 'id', description: 'Reservation id (cuid)' })
  @ApiResponse({ status: 200, description: 'Reservation checked out; rooms set CLEANING.' })
  checkOut(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.checkOut(id, user.sub);
  }

  @Patch(':id/cancel')
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN or STAFF only.' })
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Cancel reservation' })
  @ApiParam({ name: 'id', description: 'Reservation id (cuid)' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled.' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.cancel(id, user.sub);
  }
}
