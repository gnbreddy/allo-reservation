import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Reading medicines.json...');
  const dataPath = path.join(__dirname, '..', 'medicines.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const medicines = JSON.parse(rawData);

  console.log('Clearing existing data...');
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  console.log('Creating warehouses...');
  const warehouseNames = [
    { name: 'Central Pharmacy Hub', location: 'New York, NY' },
    { name: 'West Coast Dispensary', location: 'Los Angeles, CA' },
    { name: 'Midwest Medical Supply', location: 'Chicago, IL' },
    { name: 'Southern Meds Distribution', location: 'Dallas, TX' },
  ];

  const warehouses = [];
  for (const w of warehouseNames) {
    const created = await prisma.warehouse.create({ data: w });
    warehouses.push(created);
  }

  console.log(`Inserting ${medicines.length} medicines...`);
  for (const med of medicines) {
    // Parse price
    let price = 10.99;
    if (med.product_price) {
      const parsed = parseFloat(med.product_price.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        price = parsed;
      }
    }

    // Determine warehouses and stock (1 to 3 warehouses randomly)
    const numWarehouses = Math.floor(Math.random() * 3) + 1;
    const shuffledWarehouses = [...warehouses].sort(() => 0.5 - Math.random()).slice(0, numWarehouses);
    
    const stockCreate = shuffledWarehouses.map(w => ({
      warehouseId: w.id,
      totalUnits: Math.floor(Math.random() * 100) + 5 // random stock between 5 and 104
    }));

    // For generic images, we can assign a random local image we generated earlier
    const images = ['/amoxicillin.png', '/atorvastatin.png', '/albuterol.png'];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    await prisma.product.create({
      data: {
        name: med.product_name || 'Unknown Medicine',
        description: med.medicine_desc ? med.medicine_desc.substring(0, 500) : 'No description available.',
        price: price,
        imageUrl: randomImage,
        stock: {
          create: stockCreate,
        },
      },
    });
  }

  console.log('Database seeded with Kaggle dataset successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
