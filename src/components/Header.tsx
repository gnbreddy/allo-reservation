"use client";

import { ShoppingCart, User as UserIcon, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export function Header() {
  const [itemCount, setItemCount] = useState(0);
  const { data: session, status } = useSession();

  const fetchCartCount = async () => {
    if (status === "loading") return;

    let targetId = "active";
    if (!session) {
      targetId = localStorage.getItem("cartId") || "";
      if (!targetId) {
        setItemCount(0);
        return;
      }
    }

    try {
      const res = await fetch(`/api/cart/${targetId}`);
      if (res.ok) {
        const cart = await res.json();
        // Count only PENDING items
        const activeItems = cart.reservations?.filter((r: any) => r.status === "PENDING" && new Date(r.expiresAt).getTime() > Date.now()) || [];
        // Sum quantities
        const count = activeItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setItemCount(count);
      } else {
        setItemCount(0);
      }
    } catch (e) {
      console.error("Failed to fetch cart count", e);
    }
  };

  useEffect(() => {
    fetchCartCount();

    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener("cart-updated", handleCartUpdate);
    
    // Poll every 10 seconds just in case an item expires
    const interval = setInterval(fetchCartCount, 10000);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      clearInterval(interval);
    };
  }, [session, status]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center px-4 max-w-[1600px] justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          Allo Health
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative flex items-center justify-center p-2 rounded-full hover:bg-zinc-800 transition-colors">
            <ShoppingCart className="h-6 w-6 text-zinc-300" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-black transform translate-x-1/4 -translate-y-1/4 bg-[#ffd814] rounded-full">
                {itemCount}
              </span>
            )}
          </Link>

          {session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                {session.user?.image ? (
                  <img src={session.user.image} alt="User" className="w-5 h-5 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-zinc-400" />
                )}
                <span className="text-sm font-medium text-zinc-300">{session.user?.name?.split(' ')[0] || 'User'}</span>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signIn()}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-full transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
