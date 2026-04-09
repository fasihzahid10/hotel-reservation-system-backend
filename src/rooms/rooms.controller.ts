import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@ApiSessionAuth()
@ApiForbiddenResponse({ description: 'Insufficient role.' })
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List rooms', description: 'Includes room type and housekeeping status.' })
  @ApiResponse({ status: 200, description: 'Array of rooms.' })
  list() {
    return this.roomsService.list();
  }

  @Post()
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Create room', description: 'ADMIN only.' })
  @ApiResponse({ status: 201, description: 'Room created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by id', description: 'Includes room type.' })
  @ApiParam({ name: 'id', description: 'Room id (cuid)' })
  @ApiResponse({ status: 200, description: 'Room.' })
  @ApiResponse({ status: 404, description: 'Room not found.' })
  getOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Update housekeeping status', description: 'ADMIN or STAFF.' })
  @ApiParam({ name: 'id', description: 'Room id (cuid)' })
  @ApiResponse({ status: 200, description: 'Room updated.' })
  @ApiResponse({ status: 404, description: 'Room not found.' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.roomsService.updateStatus(id, dto);
  }

  @Patch(':id')
  @Roles(AppRole.ADMIN, AppRole.STAFF)
  @ApiOperation({ summary: 'Update room', description: 'Partial update (number, floor, type, status, image URL).' })
  @ApiParam({ name: 'id', description: 'Room id (cuid)' })
  @ApiResponse({ status: 200, description: 'Room updated.' })
  @ApiResponse({ status: 404, description: 'Room not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }
}
