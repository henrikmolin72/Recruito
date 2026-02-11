"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, Clock, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OwnershipBadgeProps {
  ownershipEnd: string;
  status: string;
}

export function OwnershipBadge({ ownershipEnd, status }: OwnershipBadgeProps) {
  const endDate = new Date(ownershipEnd);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (status === "claimed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100">
            <CheckCircle className="size-3" />
            Utnyttjad
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kandidatskyddet har utnyttjats vid en anställning</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === "expired" || daysRemaining <= 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1 bg-gray-100 text-gray-600 hover:bg-gray-100">
            <Clock className="size-3" />
            Utgånget
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kandidatskyddet har gått ut</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === "disputed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Shield className="size-3" />
            Omtvistad
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kandidatskyddet är under utredning</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Active
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
          <Shield className="size-3" />
          {daysRemaining} dagar kvar
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Kandidatskydd aktivt till{" "}
          {endDate.toLocaleDateString("sv-SE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
