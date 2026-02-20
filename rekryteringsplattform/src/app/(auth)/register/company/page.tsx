"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { registerCompany } from "@/lib/actions/auth";

export default function RegisterCompanyPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await registerCompany(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <AppLogo size="md" priority />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Registrera företag</CardTitle>
            <CardDescription>Skapa ett företagskonto för att börja rekrytera</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                {error}
              </div>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Företagsnamn</label>
                <Input name="company_name" placeholder="AB Företaget" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Organisationsnummer</label>
                <Input name="org_number" placeholder="556xxx-xxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Bransch</label>
                <Input name="industry" placeholder="T.ex. IT & Tech, Finans" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Kontaktperson</label>
                <Input name="full_name" placeholder="Förnamn Efternamn" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input type="email" name="email" placeholder="namn@foretag.se" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lösenord</label>
                <Input type="password" name="password" placeholder="Minst 8 tecken" required />
              </div>
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? "Skapar konto..." : "Skapa konto"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Redan registrerad?{" "}
              <Link href="/login" className="text-brand-600 hover:underline font-medium">Logga in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
