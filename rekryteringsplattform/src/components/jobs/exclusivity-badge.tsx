"use client";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";

interface ExclusivityBadgeProps {
  isExclusive: boolean;
  exclusivityEndDate: string | null;
}

export function ExclusivityBadge({ isExclusive, exclusivityEndDate }: ExclusivityBadgeProps) {
  if (!isExclusive || !exclusivityEndDate) return null;

  const endDate = new Date(exclusivityEndDate);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isActive = daysRemaining > 0;

  if (!isActive) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Clock className="mr-1 h-3 w-3" />
        Exklusivitet avslutad
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
      <Shield className="mr-1 h-3 w-3" />
      Exklusivt — {daysRemaining} dagar kvar
    </Badge>
  );
}
