"use client";

import { useUser } from "@/hooks/use-user";
import { Briefcase, Users, FileCheck, TrendingUp } from "lucide-react";

export default function CompanyDashboard() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Välkommen, {user?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          Här är en översikt av din rekryteringsaktivitet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktiva jobb"
          value="0"
          icon={Briefcase}
          description="Publicerade annonser"
        />
        <StatsCard
          title="Kandidater"
          value="0"
          icon={Users}
          description="Presenterade totalt"
        />
        <StatsCard
          title="Intervjuer"
          value="0"
          icon={FileCheck}
          description="Pågående"
        />
        <StatsCard
          title="Anställda"
          value="0"
          icon={TrendingUp}
          description="Lyckade placeringar"
        />
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">Inga jobb ännu</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Skapa din första jobbannons för att börja ta emot kandidater.
        </p>
        <a
          href="/company/jobs/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
        >
          Skapa jobb
        </a>
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
