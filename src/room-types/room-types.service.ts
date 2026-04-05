import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  publicList() {
    return this.prisma.roomType.findMany({
      orderBy: { basePrice: 'asc' },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            housekeepingStatus: true,
          },
        },
      },
    });
  }

  list() {
    return this.prisma.roomType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });
  }

  create(dto: CreateRoomTypeDto) {
    return this.prisma.roomType.create({
      data: {
        ...dto,
        basePrice: dto.basePrice,
      },
    });
  }

  async update(id: string, dto: UpdateRoomTypeDto) {
    const roomType = await this.prisma.roomType.findUnique({ where: { id } });

    if (!roomType) {
      throw new NotFoundException(`No room type found with id "${id}".`);
    }

    return this.prisma.roomType.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const roomType = await this.prisma.roomType.findUnique({ where: { id } });

    if (!roomType) {
      throw new NotFoundException(`No room type found with id "${id}".`);
    }

    return this.prisma.roomType.delete({ where: { id } });
  }
}
