"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function CheckoutClient({ cart }: { cart: any }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(cart.status);
  const [loading, setLoading] = useState(false);

  const activeItems = cart.reservations.filter((r: any) => r.status === "PENDING" && new Date(r.expiresAt).getTime() > Date.now());
  const total = activeItems.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cart/${cart.id}/checkout`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("CHECKED_OUT");
        localStorage.removeItem("cartId");
        window.dispatchEvent(new Event("cart-updated"));
        toast.success("Purchase successful!");
      } else {
        throw new Error(data.error || "Failed to confirm.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (activeItems.length === 0 && status !== "CHECKED_OUT") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center text-zinc-400">Your cart has no active items or they have expired.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-xl w-full border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-2xl">
        <CardHeader className="text-center pb-8 border-b border-zinc-800/50">
          <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Secure Checkout
          </CardTitle>
          <p className="text-zinc-400 mt-2">Complete your purchase</p>
        </CardHeader>
        <CardContent className="pt-8">
          {status === "CHECKED_OUT" && (
            <div className="flex flex-col items-center justify-center p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-8">
              <ShieldCheck className="w-16 h-16 text-emerald-400 mb-4" />
              <div className="text-2xl font-bold text-emerald-400 mb-2">Order Confirmed!</div>
              <p className="text-emerald-300/80 text-center">Your order is being processed.</p>
            </div>
          )}

          {status !== "CHECKED_OUT" && (
            <div className="space-y-4">
              {activeItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b border-zinc-800">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{item.product.name}</span>
                    <span className="text-xs text-zinc-500">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-medium text-white">${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3">
                <span className="text-zinc-300 font-bold">Total</span>
                <span className="font-bold text-xl text-white">${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6 pb-8 bg-zinc-900/30 rounded-b-xl border-t border-zinc-800/50">
          {status !== "CHECKED_OUT" ? (
            <>
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-lg h-12 transition-all hover:scale-[1.02]" 
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Purchase"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-zinc-400 hover:text-white" 
                onClick={() => router.push("/cart")}
                disabled={loading}
              >
                Return to Cart
              </Button>
            </>
          ) : (
             <Button 
               variant="default" 
               className="w-full text-lg h-12" 
               onClick={() => router.push("/")}
             >
               Return to Shop
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
