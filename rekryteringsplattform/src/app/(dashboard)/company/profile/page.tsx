import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/actions/company";
import { SubmitButton } from "@/components/shared/submit-button";

export default async function CompanyProfilePage() {
  const { profile, company } = await getCompanyProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Företagsprofil</h1>
        <p className="text-muted-foreground">Hantera din företagsinformation</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Företagsinformation</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              "use server";
              await updateCompanyProfile(formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Företagsnamn</label>
                  <Input name="company_name" defaultValue={company?.company_name || ""} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Organisationsnummer</label>
                  <Input name="org_number" defaultValue={company?.org_number || ""} placeholder="556xxx-xxxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stad</label>
                  <Input name="city" defaultValue={company?.city || ""} placeholder="t.ex. Stockholm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Bransch</label>
                  <Input name="industry" defaultValue={company?.industry || ""} placeholder="t.ex. IT & SaaS" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Webbplats</label>
                <Input name="website" defaultValue={company?.website || ""} placeholder="https://" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontaktperson</label>
                  <Input name="contact_name" defaultValue={profile?.full_name || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-post</label>
                  <Input name="contact_email" defaultValue={company?.billing_email || profile?.email || ""} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Beskrivning</label>
                <textarea
                  name="description"
                  className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm min-h-[100px]"
                  defaultValue={company?.description || ""}
                  placeholder="Berätta kort om ert företag..."
                />
              </div>
              <SubmitButton>Spara ändringar</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logotyp</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="h-24 w-24 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-12 w-12 text-brand-600" />
            </div>
            <p className="text-xs text-muted-foreground">Logotyp-uppladdning kommer snart</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
