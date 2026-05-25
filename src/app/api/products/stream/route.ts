import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      let lastHash = "";

      const fetchAndSend = async () => {
        try {
          // Fetch products with their stock levels and warehouse details
          const products = await prisma.product.findMany({
            include: {
              stock: {
                include: {
                  warehouse: true,
                },
              },
            },
          });

          const formattedProducts = products.map((product) => ({
            ...product,
            stock: product.stock.map((s) => ({
              ...s,
              availableUnits: s.totalUnits - s.reservedUnits,
            })),
          }));

          const newHash = JSON.stringify(formattedProducts);
          if (newHash !== lastHash) {
            lastHash = newHash;
            controller.enqueue(new TextEncoder().encode(`data: ${newHash}\n\n`));
          }
        } catch (error) {
          console.error("SSE Fetch Error:", error);
        }
      };

      // Send initial data immediately
      await fetchAndSend();

      // Poll every 2 seconds
      intervalId = setInterval(fetchAndSend, 2000);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
