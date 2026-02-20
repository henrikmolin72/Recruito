"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
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
            <CardTitle>Logga in</CardTitle>
            <CardDescription>Ange dina uppgifter för att fortsätta</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                {error}
              </div>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input type="email" name="email" placeholder="namn@foretag.se" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lösenord</label>
                <Input type="password" name="password" placeholder="Ange lösenord" required />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Kom ihåg mig
                </label>
                <Link href="/forgot-password" className="text-brand-600 hover:underline">Glömt lösenord?</Link>
              </div>
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? "Loggar in..." : "Logga in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Har du inget konto?{" "}
              <Link href="/register" className="text-brand-600 hover:underline font-medium">
                Registrera dig
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
