import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestsService } from './guests.service';

@ApiTags('Guests')
@ApiSessionAuth()
@ApiForbiddenResponse({ description: 'Insufficient role.' })
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get()
  @ApiOperation({ summary: 'List all guests' })
  @ApiResponse({ status: 200, description: 'Array of guests.' })
  list() {
    return this.guestsService.list();
  }

  @Post()
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Create guest', description: 'ADMIN or STAFF.' })
  @ApiResponse({ status: 201, description: 'Guest created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  create(@Body() dto: CreateGuestDto) {
    return this.guestsService.create(dto);
  }

  @Patch(':id')
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Update guest', description: 'ADMIN or STAFF.' })
  @ApiParam({ name: 'id', description: 'Guest id (cuid)' })
  @ApiResponse({ status: 200, description: 'Guest updated.' })
  @ApiResponse({ status: 404, description: 'Guest not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.guestsService.update(id, dto);
  }
}
