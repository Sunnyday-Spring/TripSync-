import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create User 1: Akbar (Demo User 1)
  const user1 = await prisma.user.upsert({
    where: { email: 'demo@tripsync.com' },
    update: {},
    create: {
      email: 'demo@tripsync.com',
      name: 'Akbar (Demo)',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    },
  });

  // Create User 2: Dan (Demo User 2)
  const user2 = await prisma.user.upsert({
    where: { email: 'dan@tripsync.com' },
    update: {},
    create: {
      email: 'dan@tripsync.com',
      name: 'Dan (Friend)',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    },
  });

  console.log('Demo Users created:', user1.email, user2.email);

  // Check if sample trip exists
  const existingTrip = await prisma.trip.findFirst({
    where: { ownerId: user1.id },
  });

  if (!existingTrip) {
    const trip = await prisma.trip.create({
      data: {
        name: 'Chiang Mai Trip 🌲',
        description: 'ทริปเชียงใหม่ 3 วัน 2 คืน เที่ยวคาเฟ่และดอยสุเทพ',
        startDate: new Date('2026-10-23T00:00:00.000Z'),
        endDate: new Date('2026-10-25T00:00:00.000Z'),
        ownerId: user1.id,
        members: {
          create: [
            { userId: user1.id, role: 'OWNER' },
            { userId: user2.id, role: 'MEMBER' },
          ],
        },
        activities: {
          create: [
            {
              title: '☕ Graph Cafe',
              description: 'จิบกาแฟสเปเชียลตี้ตอนเช้าในเมืองเก่า',
              date: new Date('2026-10-23T00:00:00.000Z'),
              startTime: '09:00',
              endTime: '10:30',
              location: 'Graph Cafe, Chiang Mai',
              latitude: 18.7883,
              longitude: 98.9853,
              category: 'Cafe',
              estimatedCost: 350,
              order: 1,
            },
            {
              title: '🌄 วัดพระธาตุดอยสุเทพ',
              description: 'ขึ้นไหว้พระธาตุและชมวิวเมืองเชียงใหม่',
              date: new Date('2026-10-23T00:00:00.000Z'),
              startTime: '11:00',
              endTime: '13:00',
              location: 'Wat Phra That Doi Suthep',
              latitude: 18.8048,
              longitude: 98.9216,
              category: 'Culture',
              estimatedCost: 100,
              order: 2,
            },
            {
              title: '🍜 ข้าวซอยคุณยาย',
              description: 'ทานทานอาหารเหนือต้นตำรับ',
              date: new Date('2026-10-23T00:00:00.000Z'),
              startTime: '13:30',
              endTime: '14:30',
              location: 'Khao Soi Khun Yai',
              latitude: 18.7963,
              longitude: 98.9830,
              category: 'Food',
              estimatedCost: 200,
              order: 3,
            },
          ],
        },
        expenses: {
          create: [
            {
              title: 'โรงแรมที่พัก 2 คืน',
              amount: 3000,
              paidById: user1.id,
              category: 'Hotel',
              note: 'หาร 2 คน',
              splits: {
                create: [
                  { userId: user1.id, amount: 1500 },
                  { userId: user2.id, amount: 1500 },
                ],
              },
            },
            {
              title: 'มื้อเย็นวันแรก',
              amount: 800,
              paidById: user2.id,
              category: 'Food',
              note: 'หาร 2 คน',
              splits: {
                create: [
                  { userId: user1.id, amount: 400 },
                  { userId: user2.id, amount: 400 },
                ],
              },
            },
          ],
        },
      },
    });

    console.log('Sample Trip created:', trip.name, 'with ID:', trip.id);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
