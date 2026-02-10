import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function toggleVerifyCompany(companyId: string) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  // Get current verification status
  const { data: company } = await supabase
    .from("companies")
    .select("is_verified")
    .eq("id", companyId)
    .single();

  if (!company) return;

  const { error } = await supabase
    .from("companies")
    .update({
      is_verified: !company.is_verified,
      verified_at: !company.is_verified ? new Date().toISOString() : null,
    })
    .eq("id", companyId);

  if (error) {
    throw new Error(`Kunde inte uppdatera verifieringsstatus: ${error.message}`);
  }

  // Log activity
  await supabase.from("activity_log").insert({
    action_type: company.is_verified
      ? "company_unverified"
      : "company_verified",
    description: company.is_verified
      ? "Företag avverifierat"
      : "Företag verifierat",
    entity_type: "company",
    entity_id: companyId,
  });

  revalidatePath("/admin/companies");
}

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  // Fetch companies with active job counts
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch job counts per company
  const companyIds = companies?.map((c) => c.id) ?? [];
  let jobCounts: Record<string, number> = {};

  if (companyIds.length > 0) {
    const { data: jobData } = await supabase
      .from("jobs")
      .select("company_id")
      .in("company_id", companyIds)
      .eq("status", "active");

    if (jobData) {
      jobCounts = jobData.reduce(
        (acc: Record<string, number>, job) => {
          acc[job.company_id] = (acc[job.company_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Företag</h1>
        <p className="text-muted-foreground">
          Hantera företag registrerade på plattformen
        </p>
      </div>

      {companies && companies.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Företagsnamn</TableHead>
                <TableHead>Kontaktperson</TableHead>
                <TableHead>Org.nr</TableHead>
                <TableHead>Stad</TableHead>
                <TableHead>Verifierat</TableHead>
                <TableHead>Aktiva jobb</TableHead>
                <TableHead>Registrerad</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {company.company_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{company.contact_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.contact_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.org_number || "-"}
                  </TableCell>
                  <TableCell>{company.city || "-"}</TableCell>
                  <TableCell>
                    {company.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="size-4" />
                        Ja
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <XCircle className="size-4" />
                        Nej
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{jobCounts[company.id] ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(company.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <form
                      action={toggleVerifyCompany.bind(null, company.id)}
                    >
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className={
                          company.is_verified
                            ? "gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                            : "gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                        }
                      >
                        {company.is_verified ? (
                          <>
                            <XCircle className="size-3" />
                            Avverifiera
                          </>
                        ) : (
                          <>
                            <CheckCircle className="size-3" />
                            Verifiera
                          </>
                        )}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="size-10" />}
          title="Inga företag registrerade"
          description="Företag visas här när de registrerar sig på plattformen."
        />
      )}
    </div>
  );
}
