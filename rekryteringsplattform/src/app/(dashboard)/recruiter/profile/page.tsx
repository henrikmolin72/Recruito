import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { getRecruiterProfile, updateRecruiterProfile } from "@/lib/actions/recruiter";
import { SubmitButton } from "@/components/shared/submit-button";

export default async function RecruiterProfilePage() {
  const { profile, recruiter } = await getRecruiterProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Min profil</h1>
        <p className="text-muted-foreground">Hantera din rekryterarprofil</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personuppgifter</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              "use server";
              await updateRecruiterProfile(formData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Namn</label>
                <Input name="full_name" defaultValue={profile?.full_name || ""} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input defaultValue={profile?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">E-post kan inte ändras här.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <Input name="phone" defaultValue={profile?.phone || ""} placeholder="+46 70 000 00 00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Headline</label>
                <Input name="headline" defaultValue={recruiter?.headline || ""} placeholder="t.ex. Senior IT-rekryterare" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">LinkedIn</label>
                <Input name="linkedin_url" defaultValue={recruiter?.linkedin_url || ""} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Bio</label>
                <textarea
                  name="bio"
                  className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm min-h-[100px]"
                  defaultValue={recruiter?.bio || ""}
                  placeholder="Berätta om din erfarenhet och specialiseringar..."
                />
              </div>
              <SubmitButton>Spara ändringar</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Kontostatus</span>
                <Badge variant={recruiter?.approval_status === "approved" ? "success" : "warning"}>
                  {recruiter?.approval_status === "approved" ? "Godkänd" : recruiter?.approval_status === "pending" ? "Inväntar granskning" : recruiter?.approval_status || "Okänd"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Betyg</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning-500 text-warning-500" />
                  <span className="text-sm font-medium">{recruiter?.rating || "—"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Placeringar</span>
                <span className="text-sm font-medium">{recruiter?.total_placements || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Erfarenhet</span>
                <span className="text-sm font-medium">{recruiter?.years_experience ? `${recruiter.years_experience} år` : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
