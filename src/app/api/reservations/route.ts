import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const { productId, warehouseId, quantity = 1, cartId } = await request.json();
    const idempotencyKey = request.headers.get("Idempotency-Key");
    
    const session = await auth();
    const userId = session?.user?.id;

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

      // If a cartId was passed, ensure the cart exists, otherwise create one.
      let activeCartId = cartId;
      if (activeCartId) {
        const cart = await tx.cart.findUnique({ where: { id: activeCartId } });
        if (!cart) activeCartId = undefined; // Fallback if invalid cartId
      }

      if (!activeCartId) {
        const newCart = await tx.cart.create({
          data: { 
            status: "ACTIVE",
            userId: userId || undefined
          },
        });
        activeCartId = newCart.id;
      } else if (userId) {
        // If they logged in but already had an anonymous cart, link the cart to them
        await tx.cart.update({
          where: { id: activeCartId },
          data: { userId },
        });
      }

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey: idempotencyKey || null,
          cartId: activeCartId,
          userId: userId || undefined
        },
      });

      return { reservation, cartId: activeCartId };
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
