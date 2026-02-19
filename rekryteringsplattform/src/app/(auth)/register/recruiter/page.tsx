"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { registerRecruiter } from "@/lib/actions/auth";

export default function RegisterRecruiterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await registerRecruiter(formData);
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
            <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="text-2xl font-bold text-brand-600">Recruito</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Bli rekryterare</CardTitle>
            <CardDescription>Skapa ett rekryterarkonto och börja tjäna pengar</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                {error}
              </div>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Fullständigt namn</label>
                <Input name="full_name" placeholder="Förnamn Efternamn" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input type="email" name="email" placeholder="erik@example.se" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rubrik / Headline</label>
                <Input name="headline" placeholder="T.ex. Senior IT-rekryterare med 10 års erfarenhet" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">LinkedIn-profil</label>
                <Input name="linkedin_url" placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Års erfarenhet</label>
                <Input type="number" name="years_experience" placeholder="5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lösenord</label>
                <Input type="password" name="password" placeholder="Minst 8 tecken" required />
              </div>
              <Button className="w-full bg-success-500 hover:bg-success-700" size="lg" disabled={loading}>
                {loading ? "Skickar ansökan..." : "Skicka ansökan"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Din ansökan granskas innan kontot aktiveras.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
