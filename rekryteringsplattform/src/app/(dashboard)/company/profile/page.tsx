import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldCheck } from "lucide-react";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/actions/company";
import { SubmitButton } from "@/components/shared/submit-button";
import { getDictionary } from "@/i18n/server";

export default async function CompanyProfilePage() {
  const { profile, company } = await getCompanyProfile();
  const dict = await getDictionary();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.profilePageTitle}</h1>
          <p className="text-muted-foreground">{c.profilePageSubtitle}</p>
        </div>
        {company?.is_verified && (
          <Badge variant="success" className="gap-1 h-6">
            <ShieldCheck className="h-3 w-3" />
            {dict.components.verifiedCompany}
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{c.companyInfoTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              "use server";
              await updateCompanyProfile(formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{c.companyNameLabel}</label>
                  <Input name="company_name" defaultValue={company?.company_name || ""} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{c.orgNumberLabel}</label>
                  <Input name="org_number" defaultValue={company?.org_number || ""} placeholder="556xxx-xxxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{c.cityLabel}</label>
                  <Input name="city" defaultValue={company?.city || ""} placeholder={c.cityPlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{c.industryLabel}</label>
                  <Input name="industry" defaultValue={company?.industry || ""} placeholder={c.industryInputPlaceholder} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{c.websiteLabel}</label>
                <Input name="website" defaultValue={company?.website || ""} placeholder="https://" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{c.contactPersonLabel}</label>
                  <Input name="contact_name" defaultValue={profile?.full_name || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{dict.common.email}</label>
                  <Input name="contact_email" defaultValue={company?.billing_email || profile?.email || ""} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{c.descriptionLabel}</label>
                <textarea
                  name="description"
                  className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm min-h-[100px]"
                  defaultValue={company?.description || ""}
                  placeholder={c.descriptionPlaceholder}
                />
              </div>
              <SubmitButton>{dict.common.saveChanges}</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{c.logoTitle}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="h-24 w-24 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-12 w-12 text-brand-600" />
            </div>
            <p className="text-xs text-muted-foreground">{c.logoUploadComingSoon}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
