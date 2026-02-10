import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*, jobs(title, company_id)")
    .eq("id", id)
    .single();

  if (!candidate) notFound();

  const job = candidate.jobs as any;

  // Verify this candidate belongs to the user's company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!company || job?.company_id !== company.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/company/jobs/${candidate.job_id}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 size-4" />
          Tillbaka till {job?.title}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {candidate.first_name} {candidate.last_name}
            </h1>
            <p className="text-muted-foreground">
              {candidate.current_title}
              {candidate.current_company && ` på ${candidate.current_company}`}
            </p>
          </div>
          <StatusBadge status={candidate.status} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontaktuppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {candidate.email && (
              <div>
                <span className="text-muted-foreground">E-post:</span>{" "}
                {candidate.email}
              </div>
            )}
            {candidate.phone && (
              <div>
                <span className="text-muted-foreground">Telefon:</span>{" "}
                {candidate.phone}
              </div>
            )}
            {candidate.linkedin_url && (
              <div>
                <span className="text-muted-foreground">LinkedIn:</span>{" "}
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  Visa profil
                </a>
              </div>
            )}
            {candidate.years_experience != null && (
              <div>
                <span className="text-muted-foreground">Erfarenhet:</span>{" "}
                {candidate.years_experience} år
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tidslinje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Inskickad:</span>{" "}
              {formatDate(candidate.submitted_at)}
            </div>
            {candidate.reviewed_at && (
              <div>
                <span className="text-muted-foreground">Granskad:</span>{" "}
                {formatDate(candidate.reviewed_at)}
              </div>
            )}
            {candidate.interview_at && (
              <div>
                <span className="text-muted-foreground">Intervju:</span>{" "}
                {formatDate(candidate.interview_at)}
              </div>
            )}
            {candidate.offered_at && (
              <div>
                <span className="text-muted-foreground">Erbjuden:</span>{" "}
                {formatDate(candidate.offered_at)}
              </div>
            )}
            {candidate.hired_at && (
              <div>
                <span className="text-muted-foreground">Anställd:</span>{" "}
                {formatDate(candidate.hired_at)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {candidate.cv_file_path && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CV</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href={candidate.cv_file_path} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 size-4" />
                Öppna CV
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {candidate.qualification_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Rekryterarens kvalificering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {candidate.qualification_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {candidate.cover_note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rekryterarens anteckning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{candidate.cover_note}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
