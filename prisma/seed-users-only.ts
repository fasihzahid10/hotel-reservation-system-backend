/**
 * Recreate seeded staff users only (no rooms / demo reservation).
 * Use after deleting users from the DB: `npm --workspace backend run prisma:seed-users`
 */
import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seed-users';

const prisma = new PrismaClient();

async function main() {
  await seedUsers(prisma);
  console.log('Users ready: superadmin@hotel.local, admin@hotel.local (Admin@123), staff@hotel.local (Staff@123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
