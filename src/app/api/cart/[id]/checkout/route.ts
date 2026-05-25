import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id },
        include: { reservations: true }
      });

      if (!cart) throw new Error("Not found");
      if (cart.status === "CHECKED_OUT") return cart; // Idempotent

      const pendingReservations = cart.reservations.filter(r => r.status === "PENDING");
      
      if (pendingReservations.length === 0) {
        throw new Error("Empty cart");
      }

      // Check for any expired reservations
      const now = new Date();
      for (const res of pendingReservations) {
        if (res.expiresAt < now) {
          // Clean it up
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: "RELEASED" },
          });
          await tx.$executeRaw`
            UPDATE "Stock"
            SET "reservedUnits" = "reservedUnits" - ${res.quantity}
            WHERE "productId" = ${res.productId} 
              AND "warehouseId" = ${res.warehouseId}
          `;
          throw new Error("Some items have expired. Please review your cart.");
        }
      }

      // Confirm all pending reservations
      for (const res of pendingReservations) {
        await tx.reservation.update({
          where: { id: res.id },
          data: { status: "CONFIRMED" },
        });

        // Permanently decrement both totalUnits and reservedUnits
        await tx.$executeRaw`
          UPDATE "Stock"
          SET 
            "totalUnits" = "totalUnits" - ${res.quantity},
            "reservedUnits" = "reservedUnits" - ${res.quantity}
          WHERE "productId" = ${res.productId} 
            AND "warehouseId" = ${res.warehouseId}
        `;
      }

      // Mark cart as checked out
      const updatedCart = await tx.cart.update({
        where: { id },
        data: { status: "CHECKED_OUT" }
      });

      return updatedCart;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Not found") return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    if (error.message.includes("expired") || error.message === "Empty cart") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Cart checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
