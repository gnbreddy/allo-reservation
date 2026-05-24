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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 32;
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

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="container mx-auto p-2 md:p-4 max-w-[1600px] min-h-screen font-sans">
      <div className="mb-8 text-center mt-6">
        <h1 className="text-3xl font-bold mb-2 text-white">
          Allo Health Dispensary
        </h1>
        <p className="text-zinc-400 text-sm">Showing {products.length} medical items</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3">
        {paginatedProducts.map((product) => (
          <div key={product.id} className="flex flex-col bg-black border border-zinc-800 rounded-sm overflow-hidden hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-shadow duration-200 h-full group">
            {/* Image Container */}
            <div className="relative w-full aspect-square bg-zinc-950 p-2 flex items-center justify-center border-b border-zinc-800">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="max-w-full max-h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105" 
                />
              ) : (
                <div className="text-gray-300 text-xs">No Image</div>
              )}
            </div>
            
            {/* Content Container */}
            <div className="p-3 flex flex-col flex-grow">
              <h2 className="text-blue-400 hover:text-[#c45500] hover:underline cursor-pointer text-sm font-medium line-clamp-2 leading-tight mb-1">
                {product.name}
              </h2>
              <div className="text-2xl font-bold text-white leading-none mb-1">
                <span className="text-xs align-top relative top-1 text-zinc-300">$</span>{Math.floor(product.price)}
                <span className="text-xs align-top relative top-1 text-zinc-300">{(product.price % 1).toFixed(2).substring(1)}</span>
              </div>
              <div className="text-xs text-zinc-400 mb-2 line-clamp-1">{product.description}</div>

              {/* Delivery / Stock Area */}
              <div className="mt-auto space-y-2">
                {product.stock.map((s: any) => (
                  <div key={s.warehouseId} className="flex flex-col gap-1 border-t border-zinc-800 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
                    <div className="text-[11px] text-zinc-400 leading-tight">
                      Ships from <span className="font-medium text-zinc-200">{s.warehouse.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${s.availableUnits > 0 ? "text-[#007600]" : "text-[#B12704]"}`}>
                        {s.availableUnits > 0 ? `In Stock (${s.availableUnits})` : "Currently unavailable"}
                      </span>
                    </div>
                    {s.availableUnits > 0 && (
                      <button 
                        onClick={() => handleReserve(product.id, s.warehouseId)}
                        disabled={reserving !== null}
                        className="w-full mt-1 bg-[#ffd814] hover:bg-[#f7ca00] text-black text-xs py-1.5 px-2 rounded-full border border-[#fcd200] shadow-sm font-medium transition-colors"
                      >
                        {reserving === product.id ? "Adding..." : "Add to Cart"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 mb-8">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-zinc-700 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &laquo; Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  currentPage === i + 1 
                    ? "bg-indigo-600 text-white border border-indigo-500" 
                    : "text-zinc-400 hover:bg-zinc-800 border border-transparent"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-zinc-700 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
