import { Injectable } from '@nestjs/common';
import { HousekeepingStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAID_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.CHECKED_OUT,
];

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function addDays(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics() {
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const thirtyDaysAgo = addDays(now, -30);

    const [
      totalRooms,
      occupiedRooms,
      noShowCount,
      cancelCount,
      checkedOutForAvg,
      ytdRevenueAgg,
      reservationsLast30,
      auditLogCount,
      pendingUnpaid,
      reservationRoomsYtd,
      allReservationsYtd,
      totalBookings,
      activeBookings,
      completedBookings,
      availableRoomsCount,
      totalRevenueAllTimeAgg,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { housekeepingStatus: HousekeepingStatus.OCCUPIED } }),
      this.prisma.reservation.count({ where: { status: ReservationStatus.NO_SHOW } }),
      this.prisma.reservation.count({ where: { status: ReservationStatus.CANCELLED } }),
      this.prisma.reservation.findMany({
        where: { status: ReservationStatus.CHECKED_OUT },
        select: { checkInDate: true, checkOutDate: true },
      }),
      this.prisma.reservation.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: PAID_STATUSES },
          checkInDate: { gte: yearStart, lt: yearEnd },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          status: { in: PAID_STATUSES },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { totalAmount: true, createdAt: true, paytabsTranRef: true },
      }),
      this.prisma.auditLog.count(),
      this.prisma.reservation.findMany({
        where: { status: ReservationStatus.PENDING },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { guest: true },
      }),
      this.prisma.reservationRoom.findMany({
        where: {
          reservation: {
            status: { in: PAID_STATUSES },
            checkInDate: { gte: yearStart, lt: yearEnd },
          },
        },
        include: {
          room: { include: { roomType: true } },
          reservation: { select: { totalAmount: true, id: true } },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          status: { in: PAID_STATUSES },
          checkInDate: { gte: yearStart, lt: yearEnd },
        },
        select: {
          totalAmount: true,
          adults: true,
          children: true,
          checkInDate: true,
          checkOutDate: true,
        },
      }),
      this.prisma.reservation.count(),
      this.prisma.reservation.count({
        where: { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] } },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.CHECKED_OUT },
      }),
      this.prisma.room.count({
        where: { housekeepingStatus: HousekeepingStatus.AVAILABLE },
      }),
      this.prisma.reservation.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: PAID_STATUSES } },
      }),
    ]);

    const occupancyRate =
      totalRooms === 0 ? 0 : Number(((occupiedRooms / totalRooms) * 100).toFixed(1));

    let totalNights = 0;
    for (const r of checkedOutForAvg) {
      const nights = Math.max(
        1,
        Math.ceil((r.checkOutDate.getTime() - r.checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      totalNights += nights;
    }
    const avgStayLengthNights =
      checkedOutForAvg.length === 0 ? 0 : Number((totalNights / checkedOutForAvg.length).toFixed(1));

    const ytdRevenue = Number(ytdRevenueAgg._sum.totalAmount ?? 0);
    const avgRevenuePerRoom = totalRooms === 0 ? 0 : Number((ytdRevenue / totalRooms).toFixed(2));

    const revenueByDay = new Map<string, number>();
    for (const r of reservationsLast30) {
      const key = r.createdAt.toISOString().slice(0, 10);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(r.totalAmount));
    }
    const revenueLast30Days: { date: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(now, -i);
      const key = d.toISOString().slice(0, 10);
      revenueLast30Days.push({ date: key, amount: Number((revenueByDay.get(key) ?? 0).toFixed(2)) });
    }

    const roomCountByReservation = new Map<string, number>();
    for (const rr of reservationRoomsYtd) {
      roomCountByReservation.set(
        rr.reservationId,
        (roomCountByReservation.get(rr.reservationId) ?? 0) + 1,
      );
    }
    const typeRevenue = new Map<string, number>();
    for (const rr of reservationRoomsYtd) {
      const n = roomCountByReservation.get(rr.reservationId) ?? 1;
      const share = Number(rr.reservation.totalAmount) / n;
      const typeName = rr.room.roomType.name;
      typeRevenue.set(typeName, (typeRevenue.get(typeName) ?? 0) + share);
    }
    const revenueByRoomType = Array.from(typeRevenue.entries()).map(([name, revenue]) => ({
      name,
      revenue: Number(revenue.toFixed(2)),
    }));

    let totalGuests = 0;
    for (const r of allReservationsYtd) {
      totalGuests += r.adults + r.children;
    }

    const monthlyRes = await this.prisma.reservation.findMany({
      where: {
        status: { in: PAID_STATUSES },
        checkInDate: { gte: new Date(now.getFullYear(), 0, 1), lt: new Date(now.getFullYear() + 1, 0, 1) },
      },
      select: { totalAmount: true, checkInDate: true },
    });
    const monthRevenue = new Map<string, number>();
    for (let m = 0; m < 12; m++) {
      monthRevenue.set(`${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`, 0);
    }
    for (const r of monthlyRes) {
      const mk = `${r.checkInDate.getFullYear()}-${String(r.checkInDate.getMonth() + 1).padStart(2, '0')}`;
      monthRevenue.set(mk, (monthRevenue.get(mk) ?? 0) + Number(r.totalAmount));
    }

    const monthlyRevenueOccupancy = Array.from({ length: 12 }, (_, i) => {
      const key = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
      const rev = monthRevenue.get(key) ?? 0;
      const occRate = totalRooms === 0 ? 0 : Math.min(100, (occupiedRooms / totalRooms) * 100);
      return {
        month: new Date(now.getFullYear(), i, 1).toLocaleString('en-US', { month: 'short' }),
        revenue: Number(rev.toFixed(2)),
        occupancy: Number(occRate.toFixed(1)),
      };
    });

    const cardPayments = await this.prisma.reservation.count({
      where: { paytabsTranRef: { not: null } },
    });
    const totalTransactions = await this.prisma.reservation.count({
      where: { status: { in: PAID_STATUSES } },
    });

    const totalRevenueAllTime = Number(totalRevenueAllTimeAgg._sum.totalAmount ?? 0);

    return {
      kpis: {
        occupancyRate,
        avgStayLengthNights,
        avgRevenuePerRoom,
        noShows: noShowCount,
        cancels: cancelCount,
      },
      revenueLast30Days,
      revenueByRoomType,
      unpaidReservations: pendingUnpaid.map((r) => ({
        id: r.id,
        bookingReference: r.bookingReference,
        guestName: r.guest.fullName,
        totalAmount: Number(r.totalAmount),
      })),
      financialIntegrity: {
        unpaidMessage:
          pendingUnpaid.length === 0 ? 'All active reservations are paid' : `${pendingUnpaid.length} unpaid booking(s)`,
        auditSummary: {
          totalTransactions,
          cashPayments: 0,
          cardPayments,
          activityLogs: auditLogCount,
        },
      },
      executive: {
        totalBookings,
        activeBookings,
        totalRevenue: totalRevenueAllTime,
        avgPerBooking:
          totalBookings === 0 ? 0 : Number((totalRevenueAllTime / totalBookings).toFixed(2)),
        completed: completedBookings,
        availableRooms: availableRoomsCount,
        occupancyRate,
        totalGuests,
        monthlyRevenueOccupancy,
        revenueByRoomTypeYtd: revenueByRoomType,
      },
    };
  }
}
