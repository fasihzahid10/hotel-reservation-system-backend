import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/enums';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomTypesService } from './room-types.service';

@ApiTags('Room Types')
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Public()
  @Get('public')
  @ApiOperation({
    summary: 'Public room type catalog',
    description: 'No authentication. Used by the public booking flow.',
  })
  @ApiResponse({ status: 200, description: 'Room types with public fields.' })
  publicList() {
    return this.roomTypesService.publicList();
  }

  @Get()
  @ApiSessionAuth()
  @ApiOperation({ summary: 'List room types (staff)', description: 'Full list for authenticated staff.' })
  @ApiResponse({ status: 200, description: 'Array of room types.' })
  list() {
    return this.roomTypesService.list();
  }

  @Post()
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN only.' })
  @Roles(AppRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create room type', description: 'SUPER_ADMIN only.' })
  @ApiResponse({ status: 201, description: 'Room type created.' })
  create(@Body() dto: CreateRoomTypeDto) {
    return this.roomTypesService.create(dto);
  }

  @Patch(':id')
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN only.' })
  @Roles(AppRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update room type', description: 'SUPER_ADMIN only.' })
  @ApiParam({ name: 'id', description: 'Room type id (cuid)' })
  @ApiResponse({ status: 200, description: 'Room type updated.' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.roomTypesService.update(id, dto);
  }

  @Delete(':id')
  @ApiSessionAuth()
  @ApiForbiddenResponse({ description: 'ADMIN only.' })
  @Roles(AppRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete room type', description: 'SUPER_ADMIN only.' })
  @ApiParam({ name: 'id', description: 'Room type id (cuid)' })
  @ApiResponse({ status: 200, description: 'Room type removed.' })
  remove(@Param('id') id: string) {
    return this.roomTypesService.remove(id);
  }
}
