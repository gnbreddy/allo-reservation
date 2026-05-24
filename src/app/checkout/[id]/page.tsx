import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutClient from "./checkout-client";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    }
  });

  if (!reservation) {
    notFound();
  }

  // Pass plain object to client component
  const plainReservation = {
    ...reservation,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
  };

  return <CheckoutClient reservation={plainReservation} />;
}
