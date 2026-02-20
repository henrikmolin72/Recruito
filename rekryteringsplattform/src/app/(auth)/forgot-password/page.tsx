"use client";

import Link from "next/link";
import { useState } from "react";
import { AppLogo } from "@/components/shared/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await requestPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
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
            <CardTitle>Glömt lösenord</CardTitle>
            <CardDescription>Ange din e-post så skickar vi en återställningslänk.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">{error}</div>
            ) : null}

            {success ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-success-50 text-success-700 text-sm">
                  Om adressen finns i systemet har en återställningslänk skickats.
                </div>
                <p className="text-sm text-muted-foreground">Kontrollera inkorg och skräppost, och följ länken i mailet.</p>
                <Link href="/login" className="inline-block text-sm text-brand-600 hover:underline font-medium">
                  Tillbaka till inloggning
                </Link>
              </div>
            ) : (
              <form action={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-post</label>
                  <Input type="email" name="email" placeholder="namn@foretag.se" required />
                </div>
                <Button className="w-full" size="lg" disabled={loading}>
                  {loading ? "Skickar..." : "Skicka återställningslänk"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="text-brand-600 hover:underline font-medium">
                    Tillbaka till inloggning
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
