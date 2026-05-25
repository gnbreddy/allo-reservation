"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, Clock, AlertCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function CartPage() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  const fetchCart = async () => {
    if (status === "loading") return;

    let targetId = "active";
    if (!session) {
      targetId = localStorage.getItem("cartId") || "";
      if (!targetId) {
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/cart/${targetId}`);
      if (res.ok) {
        const fetchedCart = await res.json();
        setCart(fetchedCart);
        if (session && fetchedCart.id && localStorage.getItem("cartId") !== fetchedCart.id) {
          localStorage.setItem("cartId", fetchedCart.id);
        }
      } else if (res.status === 404 && session) {
         // It's okay if a logged in user has no active cart
         setCart(null);
      }
    } catch (e) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    const interval = setInterval(fetchCart, 10000);
    return () => clearInterval(interval);
  }, [session, status]);

  const updateQuantity = async (id: string, newQuantity: number) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity })
      });
      if (res.ok) {
        fetchCart();
        window.dispatchEvent(new Event("cart-updated"));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update quantity");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchCart();
        window.dispatchEvent(new Event("cart-updated"));
        toast.success("Item removed from cart");
      } else {
        toast.error("Failed to remove item");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-zinc-400">Loading cart...</div>;
  }

  const items = cart?.reservations || [];
  const activeItems = items.filter((r: any) => r.status === "PENDING");
  const unexpiredItems = activeItems.filter((r: any) => new Date(r.expiresAt).getTime() > Date.now());
  const expiredItems = activeItems.filter((r: any) => new Date(r.expiresAt).getTime() <= Date.now());

  const total = unexpiredItems.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Your Cart</h1>

      {!cart || activeItems.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="w-16 h-16 text-zinc-700 mb-4" />
            <div className="text-xl text-zinc-400 mb-4">Your cart is empty</div>
            <Link href="/">
              <Button className="bg-[#ffd814] hover:bg-[#f7ca00] text-black">Continue Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {expiredItems.length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
                <div className="flex items-center gap-2 text-rose-400 mb-2 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  Some items have expired
                </div>
                <div className="text-sm text-rose-300">
                  Please remove them to proceed with checkout.
                </div>
              </div>
            )}
            
            {activeItems.map((item: any) => {
              const isExpired = new Date(item.expiresAt).getTime() <= Date.now();
              return (
                <Card key={item.id} className={`border-zinc-800 ${isExpired ? 'opacity-60 bg-zinc-900' : 'bg-zinc-950'} overflow-hidden`}>
                  <div className="flex p-4 gap-4">
                    <div className="w-24 h-24 bg-zinc-900 rounded-md p-2 flex-shrink-0 flex items-center justify-center">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                      ) : (
                        <div className="text-xs text-zinc-500">No Image</div>
                      )}
                    </div>
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-blue-400 leading-tight">{item.product.name}</h3>
                          <div className="font-bold text-lg text-white ml-2">${item.product.price.toFixed(2)}</div>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">Ships from: {item.warehouse.name}</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 bg-zinc-900 rounded-md p-1 border border-zinc-800">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isExpired}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-medium text-sm text-white">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={isExpired}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {!isExpired && (
                            <div className="flex items-center text-xs text-indigo-400 gap-1 bg-indigo-500/10 px-2 py-1 rounded">
                              <Clock className="w-3 h-3" />
                              Reserved
                            </div>
                          )}
                          {isExpired && (
                            <div className="text-xs font-bold text-rose-500">Expired</div>
                          )}
                          <button onClick={() => deleteItem(item.id)} className="text-zinc-500 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          
          <div className="md:col-span-1">
            <Card className="border-zinc-800 bg-zinc-950 sticky top-20">
              <CardHeader className="pb-4 border-b border-zinc-800">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Items ({unexpiredItems.reduce((acc: number, item: any) => acc + item.quantity, 0)})</span>
                  <span className="text-white font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Shipping & Handling</span>
                  <span className="text-emerald-400">Free</span>
                </div>
                <div className="border-t border-zinc-800 pt-4 flex justify-between items-end">
                  <span className="text-lg font-bold text-white">Order Total</span>
                  <span className="text-2xl font-bold text-white">${total.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-[#ffd814] hover:bg-[#f7ca00] text-black font-medium text-sm h-10 rounded-full"
                  disabled={unexpiredItems.length === 0 || expiredItems.length > 0}
                  onClick={() => router.push(`/checkout/${cart.id}`)}
                >
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
