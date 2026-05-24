import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new Error("Not found");
      }

      if (reservation.status === "CONFIRMED") {
        return reservation; // Idempotent confirm if user clicks multiple times
      }

      if (reservation.status === "RELEASED") {
        throw new Error("Expired");
      }

      if (reservation.expiresAt < new Date()) {
        // The reservation expired but hasn't been lazily cleaned up yet.
        // We clean it up now and throw Expired.
        await tx.reservation.update({
          where: { id },
          data: { status: "RELEASED" },
        });

        await tx.$executeRaw`
          UPDATE "Stock"
          SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
          WHERE "productId" = ${reservation.productId} 
            AND "warehouseId" = ${reservation.warehouseId}
        `;
        throw new Error("Expired");
      }

      // Valid PENDING reservation within expiry time. Confirm it!
      const confirmed = await tx.reservation.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });

      // Permanently decrement both totalUnits and reservedUnits
      await tx.$executeRaw`
        UPDATE "Stock"
        SET 
          "totalUnits" = "totalUnits" - ${reservation.quantity},
          "reservedUnits" = "reservedUnits" - ${reservation.quantity}
        WHERE "productId" = ${reservation.productId} 
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return confirmed;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Not found") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    if (error.message === "Expired") {
      return NextResponse.json({ error: "Reservation expired" }, { status: 410 });
    }
    console.error("Confirm error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
