import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HousekeepingStatus, PaymentMethod, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeDateRange, calculateNights } from '../common/utils/date';
import { AppPaymentMethod } from '../common/enums';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { AuditService } from '../audit/audit.service';
import { PaytabsService } from '../payments/paytabs.service';

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
];

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly paytabs: PaytabsService,
    private readonly config: ConfigService,
  ) {}

  async searchAvailability(dto: SearchAvailabilityDto) {
    let checkIn: Date;
    let checkOut: Date;
    try {
      ({ checkIn, checkOut } = normalizeDateRange(dto.checkInDate, dto.checkOutDate));
    } catch {
      throw new BadRequestException(
        'Invalid dates. Use ISO format YYYY-MM-DD with check-out strictly after check-in.',
      );
    }
    const roomsRequested = dto.roomsRequested ?? 1;

    const roomTypes = await this.prisma.roomType.findMany({
      orderBy: { basePrice: 'asc' },
      include: {
        rooms: {
          where: {
            housekeepingStatus: {
              notIn: [HousekeepingStatus.MAINTENANCE, HousekeepingStatus.OUT_OF_SERVICE],
            },
            reservationRooms: {
              none: {
                reservation: {
                  status: { in: ACTIVE_RESERVATION_STATUSES },
                  checkInDate: { lt: checkOut },
                  checkOutDate: { gt: checkIn },
                },
              },
            },
          },
          select: {
            id: true,
            roomNumber: true,
            floor: true,
          },
        },
      },
    });

    const filtered = roomTypes
      .map((roomType) => ({
        ...roomType,
        availableCount: roomType.rooms.length,
        rooms: roomType.rooms.slice(0, roomsRequested),
      }))
      .filter((roomType) => roomType.availableCount >= roomsRequested);

    const hint =
      filtered.length === 0
        ? 'No room type has enough free rooms for these dates (overlapping reservations, maintenance/out-of-service rooms, or too many rooms requested). Try 1 room, dates at least 1 week out, or run `npm --workspace backend run prisma:seed` if the database is empty.'
        : undefined;

    const meta = {
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      roomsRequested,
      totalRoomTypesMatched: filtered.length,
      ...(hint ? { hint } : {}),
    };

    return { roomTypes: filtered, meta };
  }

  private mapAppPaymentMethod(method?: AppPaymentMethod): PaymentMethod | null {
    if (!method) return null;
    const map: Record<AppPaymentMethod, PaymentMethod> = {
      [AppPaymentMethod.CASH]: PaymentMethod.CASH,
      [AppPaymentMethod.CARD]: PaymentMethod.CARD,
      [AppPaymentMethod.ONLINE_TRANSFER]: PaymentMethod.ONLINE_TRANSFER,
      [AppPaymentMethod.PAY_ONLINE]: PaymentMethod.PAY_ONLINE,
    };
    return map[method] ?? null;
  }

  async getStatsSummary() {
    const [grouped, bookedRooms, availableRooms] = await Promise.all([
      this.prisma.reservation.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.reservationRoom.count({
        where: {
          reservation: {
            status: {
              in: [
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED,
                ReservationStatus.CHECKED_IN,
              ],
            },
          },
        },
      }),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.AVAILABLE } }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }

    return { counts, bookedRooms, availableRooms };
  }

  listReservations(filters: ListReservationsDto) {
    return this.prisma.reservation.findMany({
      where: {
        status: filters.status,
      },
      orderBy: [{ checkInDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        guest: true,
        reservationRooms: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
      },
    });
  }

  async getReservationById(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        guest: true,
        reservationRooms: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`No reservation found with id "${id}".`);
    }

    return reservation;
  }

  async createPublicReservation(dto: CreatePublicReservationDto, performedById?: string) {
    let checkIn: Date;
    let checkOut: Date;
    try {
      ({ checkIn, checkOut } = normalizeDateRange(dto.checkInDate, dto.checkOutDate));
    } catch {
      throw new BadRequestException(
        'Invalid stay dates. Use YYYY-MM-DD for check-in and check-out, with check-out after check-in.',
      );
    }

    const roomType = await this.prisma.roomType.findUnique({
      where: { id: dto.roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException(
        `Room type "${dto.roomTypeId}" does not exist. Use GET /api/room-types/public to list valid ids.`,
      );
    }

    const availableRooms = await this.prisma.room.findMany({
      where: {
        roomTypeId: dto.roomTypeId,
        housekeepingStatus: {
          notIn: [HousekeepingStatus.MAINTENANCE, HousekeepingStatus.OUT_OF_SERVICE],
        },
        reservationRooms: {
          none: {
            reservation: {
              status: { in: ACTIVE_RESERVATION_STATUSES },
              checkInDate: { lt: checkOut },
              checkOutDate: { gt: checkIn },
            },
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
      take: dto.roomsRequested,
    });

    if (availableRooms.length < dto.roomsRequested) {
      throw new BadRequestException(
        `Only ${availableRooms.length} room(s) of this type are free for the selected dates; you requested ${dto.roomsRequested}. Try other dates, another room type, or fewer rooms.`,
      );
    }

    const nights = calculateNights(checkIn, checkOut);
    const totalAmount = Number(roomType.basePrice) * nights * Number(dto.roomsRequested);

    const isPublicGuest = performedById === undefined;
    const withPayment = Boolean(dto.withPayment);

    if (isPublicGuest && this.paytabs.isConfigured() && !withPayment) {
      throw new BadRequestException(
        'Online payment is required for public bookings. Submit with withPayment: true and complete PayTabs checkout.',
      );
    }

    if (withPayment && !this.paytabs.isConfigured()) {
      throw new BadRequestException(
        'Online payment is not configured. Set PAYTABS_SERVER_KEY, PAYTABS_PROFILE_ID, and API_PUBLIC_URL, or omit withPayment.',
      );
    }

    const initialStatus = withPayment ? ReservationStatus.PENDING : ReservationStatus.CONFIRMED;
    const reservationPaymentMethod: PaymentMethod | null = withPayment
      ? PaymentMethod.PAY_ONLINE
      : performedById
        ? (this.mapAppPaymentMethod(dto.paymentMethod) ?? PaymentMethod.CASH)
        : null;

    const reservation = await this.prisma.$transaction(async (tx) => {
      const guest = await tx.guest.upsert({
        where: { email: dto.email },
        update: {
          fullName: dto.fullName,
          phone: dto.phone,
          idNumber: dto.idNumber,
        },
        create: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          idNumber: dto.idNumber,
        },
      });

      return tx.reservation.create({
        data: {
          bookingReference: this.generateBookingReference(),
          guestId: guest.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: dto.adults,
          children: dto.children ?? 0,
          notes: dto.notes,
          totalAmount,
          status: initialStatus,
          paymentMethod: reservationPaymentMethod,
          reservationRooms: {
            create: availableRooms.map((room) => ({
              roomId: room.id,
            })),
          },
        },
        include: {
          guest: true,
          reservationRooms: {
            include: {
              room: {
                include: {
                  roomType: true,
                },
              },
            },
          },
        },
      });
    });

    await this.auditService.log({
      action: 'RESERVATION_CREATED',
      entity: 'Reservation',
      entityId: reservation.id,
      description: withPayment
        ? `Reservation ${reservation.bookingReference} created (awaiting PayTabs payment).`
        : `Reservation ${reservation.bookingReference} created.`,
      performedById,
      metadata: {
        bookingReference: reservation.bookingReference,
        roomTypeId: dto.roomTypeId,
        roomsRequested: dto.roomsRequested,
        withPayment,
      },
    });

    if (!withPayment) {
      return reservation;
    }

    const apiPublic = (this.config.get<string>('API_PUBLIC_URL') ?? '').replace(/\/$/, '');
    const currency = this.config.get<string>('PAYTABS_CURRENCY') ?? 'SAR';

    try {
      const { redirectUrl } = await this.paytabs.createHostedPaymentPage({
        cartId: reservation.bookingReference,
        cartDescription: `Hotel reservation ${reservation.bookingReference}`,
        cartAmount: Number(Number(reservation.totalAmount).toFixed(2)),
        cartCurrency: currency,
        returnUrl: `${apiPublic}/api/payments/paytabs/return`,
        callbackUrl: `${apiPublic}/api/payments/paytabs/callback`,
        customer: {
          name: dto.fullName,
          email: dto.email,
          phone: dto.phone,
        },
      });
      return { ...reservation, payment: { redirectUrl } };
    } catch (e) {
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CANCELLED },
      });
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Unable to start PayTabs checkout. Reservation was not kept.',
      );
    }
  }

  async checkIn(id: string, performedById?: string) {
    const reservation = await this.getReservationById(id);

    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.PENDING
    ) {
      throw new BadRequestException(
        `Check-in is only allowed when status is CONFIRMED or PENDING. Current status: ${reservation.status}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const savedReservation = await tx.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_IN, checkedInAt: new Date() },
        include: {
          guest: true,
          reservationRooms: {
            include: {
              room: {
                include: {
                  roomType: true,
                },
              },
            },
          },
        },
      });

      await tx.room.updateMany({
        where: { id: { in: reservation.reservationRooms.map((entry) => entry.roomId) } },
        data: { housekeepingStatus: HousekeepingStatus.OCCUPIED },
      });

      return savedReservation;
    });

    await this.auditService.log({
      action: 'RESERVATION_CHECKED_IN',
      entity: 'Reservation',
      entityId: id,
      description: `Reservation ${reservation.bookingReference} checked in.`,
      performedById,
    });

    return updated;
  }

  async checkOut(id: string, performedById?: string) {
    const reservation = await this.getReservationById(id);

    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Check-out requires status CHECKED_IN. Current status: ${reservation.status}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const savedReservation = await tx.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_OUT, checkedOutAt: new Date() },
        include: {
          guest: true,
          reservationRooms: {
            include: {
              room: {
                include: {
                  roomType: true,
                },
              },
            },
          },
        },
      });

      await tx.room.updateMany({
        where: { id: { in: reservation.reservationRooms.map((entry) => entry.roomId) } },
        data: { housekeepingStatus: HousekeepingStatus.CLEANING },
      });

      return savedReservation;
    });

    await this.auditService.log({
      action: 'RESERVATION_CHECKED_OUT',
      entity: 'Reservation',
      entityId: id,
      description: `Reservation ${reservation.bookingReference} checked out.`,
      performedById,
    });

    return updated;
  }

  async cancel(id: string, performedById?: string) {
    const reservation = await this.getReservationById(id);

    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.CHECKED_OUT
    ) {
      throw new BadRequestException(
        `This reservation cannot be cancelled because it is already ${reservation.status}.`,
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
      include: {
        guest: true,
        reservationRooms: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
      },
    });

    await this.auditService.log({
      action: 'RESERVATION_CANCELLED',
      entity: 'Reservation',
      entityId: id,
      description: `Reservation ${reservation.bookingReference} cancelled.`,
      performedById,
    });

    return updated;
  }

  private generateBookingReference() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `HRS-${Date.now().toString().slice(-6)}-${random}`;
  }
}
