import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { UpdateRoomPhotoDto } from './dto/update-room-photo.dto';

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

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`No room found with id "${id}".`);
    }

    return room;
  }

  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        roomTypeId: dto.roomTypeId,
        housekeepingStatus: dto.housekeepingStatus,
        ...(dto.imageUrl !== undefined && dto.imageUrl !== null && dto.imageUrl !== ''
          ? { imageUrl: dto.imageUrl }
          : {}),
      },
      include: {
        roomType: true,
      },
    });
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException(`No room found with id "${id}".`);
    }

    const data: Record<string, unknown> = {};
    if (dto.roomNumber !== undefined) data.roomNumber = dto.roomNumber;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.roomTypeId !== undefined) data.roomTypeId = dto.roomTypeId;
    if (dto.housekeepingStatus !== undefined) data.housekeepingStatus = dto.housekeepingStatus;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;

    if (Object.keys(data).length === 0) {
      const existing = await this.prisma.room.findUnique({ where: { id }, include: { roomType: true } });
      if (!existing) {
        throw new NotFoundException(`No room found with id "${id}".`);
      }
      return existing;
    }

    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        roomType: true,
      },
    });
  }

  async updatePhoto(id: string, dto: UpdateRoomPhotoDto) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`No room found with id "${id}".`);
    }
    return this.prisma.room.update({
      where: { id },
      data: { imageUrl: dto.imageUrl ?? null },
      include: { roomType: true },
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
