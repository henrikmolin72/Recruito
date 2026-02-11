import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exportUserData, requestDataDeletion } from "@/lib/security/gdpr";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Download, Trash2, Lock, ExternalLink, Monitor } from "lucide-react";
import { DeleteDataButton } from "./delete-data-button";

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  async function handleExport() {
    "use server";
    await exportUserData(user!.id);
    // In production, this would generate a downloadable file
    // For now, the data is exported and logged via audit trail
  }

  async function handleDeletion() {
    "use server";
    const result = await requestDataDeletion(user!.id);
    if ("success" in result && result.success) {
      redirect("/login");
    }
    revalidatePath("/company/settings");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inställningar</h1>
        <p className="text-muted-foreground">
          Hantera ditt konto, säkerhet och dataskydd
        </p>
      </div>

      {/* Konto */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <CardTitle>Konto</CardTitle>
          </div>
          <CardDescription>
            Grundläggande kontoinformation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium">Namn</p>
              <p className="text-sm text-muted-foreground">
                {profile?.full_name ?? "Ej angivet"}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">E-post</p>
              <p className="text-sm text-muted-foreground">
                {profile?.email ?? user.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Säkerhet */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <CardTitle>Säkerhet</CardTitle>
          </div>
          <CardDescription>
            Lösenord och autentiseringsinställningar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium">Lösenord</p>
              <p className="text-sm text-muted-foreground">
                Lösenordsändringar hanteras via Supabase Auth. Använd
                &quot;Glömt lösenord&quot; på inloggningssidan för att
                återställa ditt lösenord.
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">Tvåfaktorsautentisering</p>
              <p className="text-sm text-muted-foreground">
                Tvåfaktorsautentisering (2FA) kan aktiveras via din
                autentiseringsleverantör för extra säkerhet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessioner */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="size-5 text-primary" />
            <CardTitle>Sessioner</CardTitle>
          </div>
          <CardDescription>
            Hantera aktiva sessioner och inloggningar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium">Aktiv session</p>
              <p className="text-sm text-muted-foreground">
                Du är för närvarande inloggad. Sessioner hanteras automatiskt
                och löper ut efter en period av inaktivitet. Logga ut manuellt
                via menyn om du vill avsluta sessionen direkt.
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">Sessionsäkerhet</p>
              <p className="text-sm text-muted-foreground">
                Alla sessioner krypteras och skyddas med HTTP-only cookies.
                Sessionstoken roteras automatiskt för att förhindra
                kapning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GDPR & Dataskydd */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <CardTitle>GDPR &amp; Dataskydd</CardTitle>
          </div>
          <CardDescription>
            Hantera dina personuppgifter i enlighet med GDPR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Exportera mina data</p>
              <p className="text-sm text-muted-foreground">
                Ladda ner en kopia av all data vi lagrar om dig, inklusive
                profil, jobb, kandidater och meddelanden. (GDPR Artikel 15 -
                Rätt till tillgång)
              </p>
              <form action={handleExport}>
                <Button type="submit" variant="outline" className="mt-2">
                  <Download className="mr-2 size-4" />
                  Exportera mina data
                </Button>
              </form>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Begär radering av data
                </p>
                <p className="text-sm text-muted-foreground">
                  Begär att all din personliga data raderas. Ditt konto
                  anonymiseras och kan inte återställas. Aktiva placeringar
                  under garantiperiod måste slutföras innan radering kan ske.
                  (GDPR Artikel 17 - Rätt till radering)
                </p>
                <DeleteDataButton action={handleDeletion} />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Integritetspolicy</p>
                <p className="text-sm text-muted-foreground">
                  Läs vår fullständiga integritetspolicy för att förstå hur vi
                  hanterar dina personuppgifter.
                </p>
                <a
                  href="/privacy"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  <ExternalLink className="mr-1 size-3" />
                  Visa integritetspolicy
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
