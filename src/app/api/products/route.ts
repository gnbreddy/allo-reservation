import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Lazy expiry cleanup: release any pending reservations that have expired
  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
    });

    if (expiredReservations.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const reservation of expiredReservations) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: "RELEASED" },
          });
          await tx.$executeRaw`
            UPDATE "Stock"
            SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
            WHERE "productId" = ${reservation.productId} 
              AND "warehouseId" = ${reservation.warehouseId}
          `;
        }
      });
    }
  } catch (error) {
    console.error("Error during lazy cleanup:", error);
  }

  // Fetch products with their stock levels and warehouse details
  const products = await prisma.product.findMany({
    include: {
      stock: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  const formattedProducts = products.map((product) => ({
    ...product,
    stock: product.stock.map((s) => ({
      ...s,
      availableUnits: s.totalUnits - s.reservedUnits,
    })),
  }));

  return NextResponse.json(formattedProducts);
}
