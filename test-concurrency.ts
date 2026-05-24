import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  console.log('Testing concurrency on reservations...');
  
  const warehouse = await prisma.warehouse.findFirst();
  if (!warehouse) {
    console.error('No warehouse found. Please seed the DB first.');
    process.exit(1);
  }

  const product = await prisma.product.create({
    data: {
      name: 'Concurrency Test Item ' + Date.now(),
      price: 1.00,
      stock: {
        create: {
          warehouseId: warehouse.id,
          totalUnits: 1,
        }
      }
    }
  });

  const productId = product.id;
  const warehouseId = warehouse.id;

  console.log(`Created test product with 1 total unit. ID: ${productId}`);
  console.log('Sending 10 simultaneous reservation requests...');

  // Start the server if it's not running or make sure it's running before this script
  const requests = Array.from({ length: 10 }).map(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 })
      });
      return res.status;
    } catch (e) {
      return 0; // Fetch failed (server might be down)
    }
  });

  const results = await Promise.all(requests);
  
  const successCount = results.filter(status => status === 201).length;
  const conflictCount = results.filter(status => status === 409).length;
  const failedCount = results.filter(status => status === 0).length;

  console.log(`Success (201): ${successCount}`);
  console.log(`Conflict (409): ${conflictCount}`);

  if (failedCount > 0) {
    console.log(`Failed to connect (${failedCount}). Is the Next.js dev server running on port 3000?`);
  } else if (successCount === 1 && conflictCount === 9) {
    console.log('✅ Concurrency test PASSED: Exactly 1 request succeeded.');
  } else {
    console.error('❌ Concurrency test FAILED. Multiple requests succeeded or something went wrong.');
  }

  process.exit(0);
}

test();
