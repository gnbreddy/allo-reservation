import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { productId, warehouseId, quantity = 1 } = await request.json();
    const idempotencyKey = request.headers.get("Idempotency-Key");

    if (!productId || !warehouseId || quantity <= 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingReservation = await prisma.reservation.findUnique({
        where: { idempotencyKey },
      });
      if (existingReservation) {
        return NextResponse.json(existingReservation);
      }
    }

    // 2. Concurrency-safe Atomic Reservation
    const result = await prisma.$transaction(async (tx) => {
      // Execute raw SQL update to ensure we only increment reserved units if there's enough stock
      const updatedRows = await tx.$executeRaw`
        UPDATE "Stock"
        SET "reservedUnits" = "reservedUnits" + ${quantity}
        WHERE "productId" = ${productId} 
          AND "warehouseId" = ${warehouseId} 
          AND ("totalUnits" - "reservedUnits") >= ${quantity}
      `;

      // If updatedRows is 0, it means the condition was not met (not enough stock or stock record doesn't exist)
      if (updatedRows === 0) {
        throw new Error("Out of stock");
      }

      // If stock was successfully reserved, create the reservation record
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey: idempotencyKey || null,
        },
      });

      return reservation;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === "Out of stock") {
      return NextResponse.json({ error: "Not enough stock available." }, { status: 409 });
    }
    // Handle Prisma unique constraint error for idempotencyKey (if two identical requests hit at the exact same millisecond)
    if (error.code === "P2002") {
       return NextResponse.json({ error: "Conflict on Idempotency Key." }, { status: 409 });
    }
    console.error("Reservation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
