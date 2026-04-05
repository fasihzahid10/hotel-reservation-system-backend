import { PrismaClient, Role, HousekeepingStatus, ReservationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@hotel.local' },
    update: { fullName: 'System Administrator', passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: { email: 'admin@hotel.local', fullName: 'System Administrator', passwordHash: adminPasswordHash, role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: 'staff@hotel.local' },
    update: { fullName: 'Front Desk Staff', passwordHash: staffPasswordHash, role: Role.STAFF },
    create: { email: 'staff@hotel.local', fullName: 'Front Desk Staff', passwordHash: staffPasswordHash, role: Role.STAFF },
  });

  const roomTypes = [
    {
      name: 'Single Deluxe',
      description: 'A modern room for solo travelers with a queen bed, workspace, and fast Wi-Fi.',
      capacity: 2,
      basePrice: '89.00',
      amenities: ['Queen Bed', 'Wi-Fi', 'Desk', 'Smart TV', 'Rain Shower'],
      roomNumbers: ['101', '102', '103', '104'],
    },
    {
      name: 'Executive Suite',
      description: 'Spacious suite with lounge area, king bed, coffee setup, and premium amenities.',
      capacity: 3,
      basePrice: '169.00',
      amenities: ['King Bed', 'Lounge Area', 'Coffee Machine', 'Smart TV', 'Mini Bar'],
      roomNumbers: ['201', '202', '203'],
    },
    {
      name: 'Family Room',
      description: 'Comfortable room with multiple beds and extra space for families.',
      capacity: 5,
      basePrice: '199.00',
      amenities: ['Two Double Beds', 'Wi-Fi', 'Mini Fridge', 'Smart TV', 'Dining Nook'],
      roomNumbers: ['301', '302', '303'],
    },
  ];

  for (const [index, roomType] of roomTypes.entries()) {
    const createdType = await prisma.roomType.upsert({
      where: { name: roomType.name },
      update: {
        description: roomType.description,
        capacity: roomType.capacity,
        basePrice: roomType.basePrice,
        amenities: roomType.amenities,
      },
      create: {
        name: roomType.name,
        description: roomType.description,
        capacity: roomType.capacity,
        basePrice: roomType.basePrice,
        amenities: roomType.amenities,
      },
    });

    for (const roomNumber of roomType.roomNumbers) {
      await prisma.room.upsert({
        where: { roomNumber },
        update: {
          floor: Number(roomNumber.charAt(0)),
          roomTypeId: createdType.id,
          housekeepingStatus: roomNumber === '203' ? HousekeepingStatus.MAINTENANCE : HousekeepingStatus.AVAILABLE,
        },
        create: {
          roomNumber,
          floor: Number(roomNumber.charAt(0)),
          roomTypeId: createdType.id,
          housekeepingStatus: roomNumber === '203' ? HousekeepingStatus.MAINTENANCE : HousekeepingStatus.AVAILABLE,
        },
      });
    }

    if (index === 0) {
      const guest = await prisma.guest.upsert({
        where: { email: 'demo.guest@example.com' },
        update: { fullName: 'Demo Guest', phone: '+1-202-555-0147', idNumber: 'AB1234567' },
        create: { fullName: 'Demo Guest', email: 'demo.guest@example.com', phone: '+1-202-555-0147', idNumber: 'AB1234567' },
      });

      const room = await prisma.room.findUnique({ where: { roomNumber: '101' } });
      if (room) {
        const demoCheckIn = new Date();
        demoCheckIn.setDate(demoCheckIn.getDate() + 30);
        demoCheckIn.setHours(0, 0, 0, 0);
        const demoCheckOut = new Date(demoCheckIn);
        demoCheckOut.setDate(demoCheckOut.getDate() + 2);

        await prisma.reservation.upsert({
          where: { bookingReference: 'HRS-DEMO-1001' },
          create: {
            bookingReference: 'HRS-DEMO-1001',
            guestId: guest.id,
            checkInDate: demoCheckIn,
            checkOutDate: demoCheckOut,
            adults: 1,
            children: 0,
            notes: 'Seeded demo reservation (room 101, ~30 days out — re-run seed to refresh dates)',
            totalAmount: '178.00',
            status: ReservationStatus.CONFIRMED,
            reservationRooms: { create: [{ roomId: room.id }] },
          },
          update: {
            checkInDate: demoCheckIn,
            checkOutDate: demoCheckOut,
            guestId: guest.id,
            notes: 'Seeded demo reservation (room 101, ~30 days out — re-run seed to refresh dates)',
            status: ReservationStatus.CONFIRMED,
            reservationRooms: {
              deleteMany: {},
              create: [{ roomId: room.id }],
            },
          },
        });
      }
    }
  }

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
