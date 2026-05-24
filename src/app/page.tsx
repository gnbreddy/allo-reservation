"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (productId: string, warehouseId: string) => {
    setReserving(productId);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Item reserved! Redirecting to checkout...");
        router.push(`/checkout/${data.id}`);
      } else if (res.status === 409) {
        toast.error(data.error || "Someone else just bought the last unit!");
        fetchProducts(); // refresh stock
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setReserving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-12 text-center mt-12">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Allo Devices
        </h1>
        <p className="text-zinc-400 text-lg">Secure your inventory instantly without race conditions.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden border-zinc-800/60 bg-zinc-950/40 backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:shadow-2xl hover:shadow-indigo-500/10">
            {product.imageUrl && (
              <div className="relative group">
                 <img src={product.imageUrl} alt={product.name} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-80" />
                 <div className="absolute bottom-4 left-4 text-2xl font-bold text-white">${product.price.toFixed(2)}</div>
              </div>
            )}
            <CardHeader className="pt-6">
              <CardTitle className="text-xl text-zinc-100">{product.name}</CardTitle>
              <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{product.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Available Stock</p>
                {product.stock.map((s: any) => (
                  <div key={s.warehouseId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/50">
                    <div>
                      <div className="font-medium text-sm text-zinc-200">{s.warehouse.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{s.warehouse.location}</div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className={`text-sm font-bold ${s.availableUnits > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {s.availableUnits} left
                      </span>
                      <Button 
                        size="sm" 
                        variant={s.availableUnits > 0 ? "default" : "secondary"}
                        className={s.availableUnits > 0 ? "bg-indigo-600 hover:bg-indigo-500 text-white" : ""}
                        disabled={s.availableUnits <= 0 || reserving !== null}
                        onClick={() => handleReserve(product.id, s.warehouseId)}
                      >
                        {reserving === product.id ? "Reserving..." : "Reserve"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
