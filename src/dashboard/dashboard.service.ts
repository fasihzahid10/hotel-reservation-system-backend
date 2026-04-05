import { Injectable } from '@nestjs/common';
import { HousekeepingStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getTodayBounds } from '../common/utils/date';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const { start, end } = getTodayBounds();

    const [
      totalRooms,
      occupiedRooms,
      availableRooms,
      arrivalsToday,
      departuresToday,
      activeReservations,
      monthRevenueAggregate,
      recentReservations,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.OCCUPIED } }),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.AVAILABLE } }),
      this.prisma.reservation.count({
        where: {
          checkInDate: { gte: start, lt: end },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        },
      }),
      this.prisma.reservation.count({
        where: {
          checkOutDate: { gte: start, lt: end },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
        },
      }),
      this.prisma.reservation.count({
        where: { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] } },
      }),
      this.prisma.reservation.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: {
            in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT],
          },
          checkInDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      this.prisma.reservation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
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
      }),
    ]);

    const occupancyRate = totalRooms === 0 ? 0 : Number(((occupiedRooms / totalRooms) * 100).toFixed(1));

    return {
      kpis: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        arrivalsToday,
        departuresToday,
        activeReservations,
        occupancyRate,
        monthRevenue: Number(monthRevenueAggregate._sum.totalAmount ?? 0),
      },
      recentReservations,
    };
  }
}
