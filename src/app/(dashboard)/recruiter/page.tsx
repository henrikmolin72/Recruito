"use client";

import { useUser } from "@/hooks/use-user";
import { RecruiterApprovalStatus } from "@/types/enums";
import { Search, FileCheck, Users, Wallet, Clock } from "lucide-react";

export default function RecruiterDashboard() {
  const { user } = useUser();

  if (user?.approval_status === RecruiterApprovalStatus.PENDING) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning-50">
            <Clock className="h-10 w-10 text-warning-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Väntar på godkännande</h1>
          <p className="text-muted-foreground">
            Ditt konto granskas av en administratör. Du får ett mejl när ditt
            konto har aktiverats och du kan börja ta uppdrag.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Välkommen, {user?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          Här är en översikt av dina rekryteringsuppdrag.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktiva mandat"
          value="0/5"
          icon={FileCheck}
          description="Lediga platser"
        />
        <StatsCard
          title="Kandidater"
          value="0"
          icon={Users}
          description="Presenterade totalt"
        />
        <StatsCard
          title="Placeringar"
          value="0"
          icon={Search}
          description="Lyckade"
        />
        <StatsCard
          title="Intäkter"
          value="0 kr"
          icon={Wallet}
          description="Totalt tjänat"
        />
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">Hitta ditt första uppdrag</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Bläddra bland tillgängliga jobb och ta ditt första mandat.
        </p>
        <a
          href="/recruiter/jobs"
          className="inline-flex h-10 items-center justify-center rounded-md bg-success-500 px-6 text-sm font-medium text-white hover:bg-success-700"
        >
          Bläddra jobb
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
