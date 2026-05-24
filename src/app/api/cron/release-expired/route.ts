import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
    });

    if (expiredReservations.length === 0) {
      return NextResponse.json({ message: "No expired reservations found" });
    }

    const releasedIds: string[] = [];

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
        releasedIds.push(reservation.id);
      }
    });

    return NextResponse.json({
      message: `Successfully released ${releasedIds.length} expired reservations.`,
      releasedIds,
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Failed to release expired reservations." }, { status: 500 });
  }
}
