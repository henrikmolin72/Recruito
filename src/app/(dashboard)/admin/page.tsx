"use client";

import { useUser } from "@/hooks/use-user";
import {
  Users,
  Building2,
  Briefcase,
  Banknote,
  UserCheck,
  Activity,
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Systemöversikt och hantering av plattformen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Väntande godkännanden"
          value="0"
          icon={UserCheck}
          description="Rekryterare att granska"
        />
        <StatsCard
          title="Aktiva rekryterare"
          value="0"
          icon={Users}
          description="Godkända"
        />
        <StatsCard
          title="Företag"
          value="0"
          icon={Building2}
          description="Registrerade"
        />
        <StatsCard
          title="Aktiva jobb"
          value="0"
          icon={Briefcase}
          description="Publicerade"
        />
        <StatsCard
          title="Placeringar"
          value="0"
          icon={Banknote}
          description="Totalt"
        />
        <StatsCard
          title="Aktivitet"
          value="0"
          icon={Activity}
          description="Senaste 24h"
        />
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
