import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gymsyncpro.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@gymsyncpro.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      emailVerified: true,
      active: true,
    },
  });

  // Create owner user
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@gymsyncpro.com' },
    update: {},
    create: {
      username: 'owner',
      email: 'owner@gymsyncpro.com',
      password: ownerPassword,
      firstName: 'Owner',
      lastName: 'User',
      role: 'owner',
      emailVerified: true,
      active: true,
    },
  });

  // Create sample membership plans
  const basicPlan = await prisma.membershipPlan.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      name: 'Basic Plan',
      description: 'Monthly membership - basic access',
      price: 500000,
      durationMonths: 1,
      active: true,
    },
  });

  const premiumPlan = await prisma.membershipPlan.upsert({
    where: { id: '2' },
    update: {},
    create: {
      id: '2',
      name: 'Premium Plan',
      description: '3-month membership with additional benefits',
      price: 1350000,
      durationMonths: 3,
      active: true,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('👤 Admin credentials:');
  console.log('   Email: admin@gymsyncpro.com');
  console.log('   Password: admin123');
  console.log('👤 Owner credentials:');
  console.log('   Email: owner@gymsyncpro.com');
  console.log('   Password: owner123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

