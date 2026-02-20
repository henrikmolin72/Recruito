"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/shared/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(formData: FormData) {
    const password = (formData.get("password") as string) || "";
    const confirmPassword = (formData.get("confirm_password") as string) || "";

    setError(null);

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || "Kunde inte uppdatera lösenordet");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/login");
    }, 1200);
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
            <CardTitle>Nytt lösenord</CardTitle>
            <CardDescription>Skapa ett nytt lösenord för ditt konto.</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="space-y-4 text-sm">
                <div className="p-3 rounded-lg bg-warning-50 text-warning-700">
                  Session för återställning hittades inte. Öppna länken från ditt återställningsmail igen.
                </div>
                <Link href="/forgot-password" className="text-brand-600 hover:underline font-medium">
                  Skicka ny återställningslänk
                </Link>
              </div>
            ) : success ? (
              <div className="p-3 rounded-lg bg-success-50 text-success-700 text-sm">
                Lösenord uppdaterat. Du skickas till inloggning...
              </div>
            ) : (
              <form action={handleSubmit} className="space-y-4">
                {error ? <div className="p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">{error}</div> : null}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nytt lösenord</label>
                  <Input type="password" name="password" placeholder="Minst 8 tecken" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Bekräfta lösenord</label>
                  <Input type="password" name="confirm_password" placeholder="Upprepa lösenord" required />
                </div>
                <Button className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sparar..." : "Uppdatera lösenord"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
