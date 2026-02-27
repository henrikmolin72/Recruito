"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

export function CheckoutButton({ placementId }: { placementId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placementId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        alert(data.error || "Kunde inte skapa betalning");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Något gick fel vid betalning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleCheckout}
      disabled={loading}
      className="whitespace-nowrap"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <CreditCard className="h-4 w-4 mr-1" />
      )}
      Betala
    </Button>
  );
}
