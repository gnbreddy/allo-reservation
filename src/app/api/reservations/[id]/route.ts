import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { quantity } = await request.json();

    if (quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new Error("Not found");
      if (reservation.status !== "PENDING") throw new Error("Cannot modify");
      if (reservation.expiresAt < new Date()) throw new Error("Expired");

      const diff = quantity - reservation.quantity;

      if (diff > 0) {
        // Increasing quantity: check if enough stock
        const updatedRows = await tx.$executeRaw`
          UPDATE "Stock"
          SET "reservedUnits" = "reservedUnits" + ${diff}
          WHERE "productId" = ${reservation.productId} 
            AND "warehouseId" = ${reservation.warehouseId} 
            AND ("totalUnits" - "reservedUnits") >= ${diff}
        `;
        if (updatedRows === 0) throw new Error("Out of stock");
      } else if (diff < 0) {
        // Decreasing quantity: release stock
        const absDiff = Math.abs(diff);
        await tx.$executeRaw`
          UPDATE "Stock"
          SET "reservedUnits" = "reservedUnits" - ${absDiff}
          WHERE "productId" = ${reservation.productId} 
            AND "warehouseId" = ${reservation.warehouseId}
        `;
      }

      // Update reservation
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { quantity },
      });

      return updatedReservation;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Out of stock") {
      return NextResponse.json({ error: "Not enough stock available." }, { status: 409 });
    }
    if (error.message === "Not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error.message === "Cannot modify" || error.message === "Expired") {
      return NextResponse.json({ error: "Reservation cannot be modified" }, { status: 400 });
    }
    console.error("Update reservation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new Error("Not found");
      if (reservation.status !== "PENDING") return; // Already confirmed or released

      // If it hasn't expired (or even if it has but wasn't lazily cleaned), we need to release stock
      await tx.$executeRaw`
        UPDATE "Stock"
        SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
        WHERE "productId" = ${reservation.productId} 
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      await tx.reservation.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("Delete reservation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
