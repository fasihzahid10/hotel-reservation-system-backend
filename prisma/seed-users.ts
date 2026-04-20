import type { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/** Super admin + desk admin share `Admin@123`; staff uses `Staff@123`. */
export async function seedUsers(prisma: PrismaClient) {
  const adminSharedPasswordHash = await bcrypt.hash('Admin@123', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@hotel.local' },
    update: {
      fullName: 'Super Administrator',
      passwordHash: adminSharedPasswordHash,
      role: Role.SUPER_ADMIN,
    },
    create: {
      email: 'superadmin@hotel.local',
      fullName: 'Super Administrator',
      passwordHash: adminSharedPasswordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@hotel.local' },
    update: {
      fullName: 'Front Desk Admin',
      passwordHash: adminSharedPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      email: 'admin@hotel.local',
      fullName: 'Front Desk Admin',
      passwordHash: adminSharedPasswordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@hotel.local' },
    update: { fullName: 'Front Desk Staff', passwordHash: staffPasswordHash, role: Role.STAFF },
    create: { email: 'staff@hotel.local', fullName: 'Front Desk Staff', passwordHash: staffPasswordHash, role: Role.STAFF },
  });
}
