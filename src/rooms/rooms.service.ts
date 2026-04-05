import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.room.findMany({
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        roomType: true,
      },
    });
  }

  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: dto,
      include: {
        roomType: true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException(`No room found with id "${id}".`);
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        housekeepingStatus: dto.housekeepingStatus,
      },
      include: {
        roomType: true,
      },
    });
  }
}
