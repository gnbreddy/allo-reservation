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

      if (reservation.status !== "PENDING") {
        // If it's already released or confirmed, we just return safely without decrementing again
        return reservation;
      }

      // Valid PENDING reservation. Release it early (e.g. user cancelled)
      const released = await tx.reservation.update({
        where: { id },
        data: { status: "RELEASED" },
      });

      // Free up the reserved stock
      await tx.$executeRaw`
        UPDATE "Stock"
        SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
        WHERE "productId" = ${reservation.productId} 
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return released;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Not found") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    console.error("Release error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
