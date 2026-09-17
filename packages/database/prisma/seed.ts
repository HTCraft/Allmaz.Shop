import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin12345', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { isVerified: true },
    create: {
      email: 'admin@example.com',
      password: adminPasswordHash,
      name: 'Администратор',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Электроника', slug: 'electronics' },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: { name: 'Одежда', slug: 'clothing' },
  });

  const products = [
    {
      title: 'Беспроводные наушники',
      slug: 'wireless-headphones',
      description: 'Наушники с активным шумоподавлением и 30 часами работы от батареи.',
      priceCents: 599900,
      sku: 'ELEC-001',
      stock: 25,
      categoryId: electronics.id,
      images: [
        'https://picsum.photos/seed/headphones1/600/600',
        'https://picsum.photos/seed/headphones2/600/600',
      ],
    },
    {
      title: 'Умные часы',
      slug: 'smart-watch',
      description: 'Фитнес-трекер, пульсометр, уведомления со смартфона.',
      priceCents: 899900,
      sku: 'ELEC-002',
      stock: 12,
      categoryId: electronics.id,
      images: ['https://picsum.photos/seed/watch1/600/600'],
    },
    {
      title: 'Механическая клавиатура',
      slug: 'mechanical-keyboard',
      description: 'Клавиатура с механическими переключателями и RGB-подсветкой.',
      priceCents: 749900,
      sku: 'ELEC-003',
      stock: 8,
      categoryId: electronics.id,
      images: ['https://picsum.photos/seed/keyboard1/600/600'],
    },
    {
      title: 'Худи оверсайз',
      slug: 'oversized-hoodie',
      description: 'Свободный крой, плотный хлопок, унисекс.',
      priceCents: 349900,
      sku: 'CLTH-001',
      stock: 40,
      categoryId: clothing.id,
      images: [
        'https://picsum.photos/seed/hoodie1/600/600',
        'https://picsum.photos/seed/hoodie2/600/600',
      ],
    },
    {
      title: 'Джинсы прямого кроя',
      slug: 'straight-jeans',
      description: 'Классические джинсы из плотного денима.',
      priceCents: 429900,
      sku: 'CLTH-002',
      stock: 30,
      categoryId: clothing.id,
      images: ['https://picsum.photos/seed/jeans1/600/600'],
    },
    {
      title: 'Кроссовки для бега',
      slug: 'running-sneakers',
      description: 'Лёгкие кроссовки с амортизирующей подошвой.',
      priceCents: 649900,
      sku: 'CLTH-003',
      stock: 0,
      categoryId: clothing.id,
      images: ['https://picsum.photos/seed/sneakers1/600/600'],
    },
  ];

  for (const p of products) {
    const { images, ...productData } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...productData,
        media: {
          create: images.map((url, index) => ({ url, type: 'IMAGE', position: index })),
        },
      },
    });
  }

  console.log('Сид выполнен: администратор, категории и товары созданы');
  console.log('Логин администратора: admin@example.com / admin12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
