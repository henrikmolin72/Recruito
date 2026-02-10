import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

async function saveSettings(formData: FormData) {
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

  const platformName = formData.get("platform_name") as string;
  const supportEmail = formData.get("support_email") as string;
  const defaultFeePercentage = formData.get("default_fee_percentage") as string;
  const maxRecruitersPerJob = formData.get("max_recruiters_per_job") as string;

  const { error } = await supabase.from("platform_settings").upsert(
    {
      id: "default",
      platform_name: platformName,
      support_email: supportEmail,
      default_fee_percentage: parseFloat(defaultFeePercentage),
      max_recruiters_per_job: parseInt(maxRecruitersPerJob, 10),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Kunde inte spara inställningar: ${error.message}`);
  }

  await supabase.from("activity_log").insert({
    action_type: "settings_updated",
    description: "Plattformsinställningar uppdaterade",
    entity_type: "settings",
    entity_id: "default",
  });

  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
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

  // Fetch current settings
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", "default")
    .single();

  const currentSettings = {
    platform_name: settings?.platform_name ?? "Rekryto",
    support_email: settings?.support_email ?? "support@rekryto.se",
    default_fee_percentage: settings?.default_fee_percentage ?? 15,
    max_recruiters_per_job: settings?.max_recruiters_per_job ?? 5,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inställningar</h1>
        <p className="text-muted-foreground">
          Konfigurera plattformens grundinställningar
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            Plattformsinställningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="platform_name">Plattformsnamn</Label>
              <Input
                id="platform_name"
                name="platform_name"
                defaultValue={currentSettings.platform_name}
                placeholder="Rekryto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_email">Support-e-post</Label>
              <Input
                id="support_email"
                name="support_email"
                type="email"
                defaultValue={currentSettings.support_email}
                placeholder="support@rekryto.se"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_fee_percentage">
                Standard arvodesprocent (%)
              </Label>
              <Input
                id="default_fee_percentage"
                name="default_fee_percentage"
                type="number"
                min="1"
                max="100"
                step="0.5"
                defaultValue={currentSettings.default_fee_percentage}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">
                Procentandel av kandidatens årslön som utgör totalt arvode
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_recruiters_per_job">
                Max rekryterare per jobb
              </Label>
              <Input
                id="max_recruiters_per_job"
                name="max_recruiters_per_job"
                type="number"
                min="1"
                max="50"
                defaultValue={currentSettings.max_recruiters_per_job}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Standardvärde för maximalt antal rekryterare som kan ta ett
                uppdrag samtidigt
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Spara inställningar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
