import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.guest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });
  }

  create(dto: CreateGuestDto) {
    return this.prisma.guest.create({ data: dto });
  }

  async update(id: string, dto: UpdateGuestDto) {
    const existing = await this.prisma.guest.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`No guest found with id "${id}".`);
    }

    return this.prisma.guest.update({
      where: { id },
      data: dto,
    });
  }
}
