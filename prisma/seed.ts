import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const warehouse1 = await prisma.warehouse.create({
    data: {
      name: 'Central Pharmacy Hub',
      location: 'New York, NY',
    },
  })

  const warehouse2 = await prisma.warehouse.create({
    data: {
      name: 'West Coast Dispensary',
      location: 'Los Angeles, CA',
    },
  })

  // Product 1
  await prisma.product.create({
    data: {
      name: 'Amoxicillin 500mg',
      description: 'Broad-spectrum penicillin antibiotic for bacterial infections.',
      price: 15.99,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
      stock: {
        create: [
          { warehouseId: warehouse1.id, totalUnits: 50 },
          { warehouseId: warehouse2.id, totalUnits: 20 },
        ],
      },
    },
  })

  // Product 2
  await prisma.product.create({
    data: {
      name: 'Atorvastatin 20mg',
      description: 'Statin medication to treat high cholesterol and triglyceride levels.',
      price: 45.50,
      imageUrl: 'https://images.unsplash.com/photo-1550572017-edb9dd5eb7a7?w=800&q=80',
      stock: {
        create: [
          { warehouseId: warehouse1.id, totalUnits: 15 },
        ],
      },
    },
  })

  // Product 3
  await prisma.product.create({
    data: {
      name: 'Albuterol Inhaler',
      description: 'Quick-relief bronchodilator for preventing and treating wheezing and shortness of breath.',
      price: 35.00,
      imageUrl: 'https://images.unsplash.com/photo-1631556097152-c2834b953a79?w=800&q=80',
      stock: {
        create: [
          { warehouseId: warehouse2.id, totalUnits: 5 },
        ],
      },
    },
  })

  console.log('Database seeded with pharmaceutical items successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
