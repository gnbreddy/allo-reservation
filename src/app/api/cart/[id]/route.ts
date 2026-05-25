import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let cart;

    const includeConfig = {
      reservations: {
        include: {
          product: true,
          warehouse: true,
        },
        orderBy: {
          createdAt: 'asc' as const
        }
      },
    };

    if (id === "active") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      cart = await prisma.cart.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        include: includeConfig,
        orderBy: { createdAt: 'desc' }
      });
    } else {
      cart = await prisma.cart.findUnique({
        where: { id },
        include: includeConfig,
      });
    }

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    return NextResponse.json(cart);
  } catch (error) {
    console.error("Cart fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
