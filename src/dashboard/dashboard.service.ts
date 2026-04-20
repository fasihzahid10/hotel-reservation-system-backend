import { Injectable } from '@nestjs/common';
import { HousekeepingStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getTodayBounds } from '../common/utils/date';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums';
import { ReservationsService } from '../reservations/reservations.service';

const PAID_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.CHECKED_OUT,
];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationsService: ReservationsService,
  ) {}

  getReservationTabStats() {
    return this.reservationsService.getStatsSummary();
  }

  async getSummary(user: AuthenticatedUser) {
    const showFinancials = user.role === AppRole.SUPER_ADMIN;
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
      totalRevenueAgg,
      transactionCount,
      bookedRooms,
      availableCount,
      occupiedCount,
      reservedCount,
      maintenanceCount,
      todayAudit,
      todayNewBookings,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.OCCUPIED } }),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.AVAILABLE } }),
      this.prisma.reservation.count({
        where: {
          checkInDate: { gte: start, lt: end },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING, ReservationStatus.CHECKED_IN] },
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
      showFinancials
        ? this.prisma.reservation.aggregate({
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
          })
        : Promise.resolve({ _sum: { totalAmount: null } }),
      this.prisma.reservation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
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
      showFinancials
        ? this.prisma.reservation.aggregate({
            _sum: { totalAmount: true },
            where: { status: { in: PAID_STATUSES } },
          })
        : Promise.resolve({ _sum: { totalAmount: null } }),
      showFinancials
        ? this.prisma.reservation.count({
            where: { status: { in: PAID_STATUSES } },
          })
        : Promise.resolve(0),
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
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.OCCUPIED } }),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.CLEANING } }),
      this.prisma.room.count({
        where: {
          housekeepingStatus: { in: [HousekeepingStatus.MAINTENANCE, HousekeepingStatus.OUT_OF_SERVICE] },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { performedBy: { select: { fullName: true } } },
      }),
      this.prisma.reservation.findMany({
        where: { createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { guest: { select: { fullName: true } } },
      }),
    ]);

    const occupancyRate = totalRooms === 0 ? 0 : Number(((occupiedRooms / totalRooms) * 100).toFixed(1));

    const activity: Array<{ id: string; label: string; at: string }> = [];
    for (const r of todayNewBookings) {
      activity.push({
        id: `res-${r.id}`,
        label: `New booking ${r.bookingReference} — ${r.guest.fullName}`,
        at: r.createdAt.toISOString(),
      });
    }
    for (const a of todayAudit) {
      activity.push({
        id: `audit-${a.id}`,
        label: a.description,
        at: a.createdAt.toISOString(),
      });
    }
    activity.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    const todayActivity = activity.slice(0, 12);

    return {
      kpis: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        bookedRooms,
        arrivalsToday,
        departuresToday,
        activeReservations,
        occupancyRate,
        monthRevenue: showFinancials ? Number(monthRevenueAggregate._sum.totalAmount ?? 0) : 0,
        totalRevenue: showFinancials ? Number(totalRevenueAgg._sum.totalAmount ?? 0) : undefined,
        transactionCount: showFinancials ? transactionCount : undefined,
        roomStatusBreakdown: {
          available: availableCount,
          occupied: occupiedCount,
          reserved: reservedCount,
          maintenance: maintenanceCount,
        },
      },
      recentReservations,
      todayActivity,
    };
  }
}
