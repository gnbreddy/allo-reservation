import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutClient from "./checkout-client";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const cart = await prisma.cart.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { product: true, warehouse: true }
      }
    }
  });

  if (!cart) {
    notFound();
  }

  // Pass plain object to client component
  const plainCart = {
    ...cart,
    createdAt: cart.createdAt.toISOString(),
    reservations: cart.reservations.map(r => ({
      ...r,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }))
  };

  return <CheckoutClient cart={plainCart} />;
}
