import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const warehouse1 = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      location: 'New York, NY',
    },
  })

  const warehouse2 = await prisma.warehouse.create({
    data: {
      name: 'West Coast Hub',
      location: 'Los Angeles, CA',
    },
  })

  const product1 = await prisma.product.create({
    data: {
      name: 'Ergonomic Chair',
      description: 'A comfortable chair for long working hours.',
      price: 299.99,
      imageUrl: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=500&q=80',
    },
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard',
      description: 'Tactile switches for the best typing experience.',
      price: 149.99,
      imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80',
    },
  })

  const product3 = await prisma.product.create({
    data: {
      name: 'Noise-Cancelling Headphones',
      description: 'Block out the noise and focus on your work.',
      price: 199.99,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    },
  })

  // Add stock levels
  await prisma.stock.create({
    data: {
      productId: product1.id,
      warehouseId: warehouse1.id,
      totalUnits: 50,
    },
  })

  await prisma.stock.create({
    data: {
      productId: product1.id,
      warehouseId: warehouse2.id,
      totalUnits: 20,
    },
  })

  await prisma.stock.create({
    data: {
      productId: product2.id,
      warehouseId: warehouse1.id,
      totalUnits: 15,
    },
  })

  await prisma.stock.create({
    data: {
      productId: product3.id,
      warehouseId: warehouse2.id,
      totalUnits: 5,
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
