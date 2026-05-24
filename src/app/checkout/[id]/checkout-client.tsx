"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ShieldCheck, AlertCircle } from "lucide-react";

export default function CheckoutClient({ reservation }: { reservation: any }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<string>(reservation.status);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "PENDING") return;

    const calculateTimeLeft = () => {
      const difference = new Date(reservation.expiresAt).getTime() - new Date().getTime();
      if (difference <= 0) {
        setStatus("EXPIRED");
        toast.error("Your reservation has expired!");
        return 0;
      }
      return Math.floor(difference / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      if (newTime <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [reservation.expiresAt, status]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("CONFIRMED");
        toast.success("Purchase successful!");
      } else if (res.status === 410) {
        setStatus("EXPIRED");
        toast.error(data.error || "Reservation expired.");
      } else {
        throw new Error(data.error || "Failed to confirm.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      if (res.ok) {
        setStatus("RELEASED");
        toast.info("Reservation cancelled.");
        router.push("/");
      }
    } catch (err) {
      toast.error("Failed to cancel.");
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-xl w-full border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-2xl">
        <CardHeader className="text-center pb-8 border-b border-zinc-800/50">
          <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Secure Checkout
          </CardTitle>
          <p className="text-zinc-400 mt-2">Complete your purchase for {reservation.product.name}</p>
        </CardHeader>
        <CardContent className="pt-8">
          
          {status === "PENDING" && (
            <div className="flex flex-col items-center justify-center p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-8">
              <Clock className="w-10 h-10 text-indigo-400 mb-3 animate-pulse" />
              <div className="text-sm font-semibold text-indigo-300 uppercase tracking-widest mb-1">Stock Reserved For</div>
              <div className="text-5xl font-mono font-bold text-white tracking-tight">{timeString}</div>
            </div>
          )}

          {status === "CONFIRMED" && (
            <div className="flex flex-col items-center justify-center p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-8">
              <ShieldCheck className="w-16 h-16 text-emerald-400 mb-4" />
              <div className="text-2xl font-bold text-emerald-400 mb-2">Order Confirmed!</div>
              <p className="text-emerald-300/80 text-center">Your order is being processed and will ship from {reservation.warehouse.name}.</p>
            </div>
          )}

          {status === "EXPIRED" && (
            <div className="flex flex-col items-center justify-center p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-8">
              <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
              <div className="text-2xl font-bold text-rose-400 mb-2">Reservation Expired</div>
              <p className="text-rose-300/80 text-center">We couldn't hold your item any longer and the stock has been released.</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-zinc-800">
              <span className="text-zinc-400">Item</span>
              <span className="font-medium text-white">{reservation.product.name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-800">
              <span className="text-zinc-400">Price</span>
              <span className="font-medium text-white">${reservation.product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-800">
              <span className="text-zinc-400">Quantity</span>
              <span className="font-medium text-white">{reservation.quantity}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-zinc-300 font-bold">Total</span>
              <span className="font-bold text-xl text-white">${(reservation.product.price * reservation.quantity).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6 pb-8 bg-zinc-900/30 rounded-b-xl border-t border-zinc-800/50">
          {status === "PENDING" && (
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
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel & Release Stock
              </Button>
            </>
          )}

          {(status === "EXPIRED" || status === "RELEASED" || status === "CONFIRMED") && (
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
