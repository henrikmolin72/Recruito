"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  registerRecruiterSchema,
  type RegisterRecruiterInput,
} from "@/lib/validations/auth";
import { JOB_INDUSTRIES } from "@/types/enums";
import { Loader2, UserSearch, Check } from "lucide-react";

export default function RegisterRecruiterPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterRecruiterInput>({
    resolver: zodResolver(registerRecruiterSchema),
    defaultValues: {
      specializations: [],
      years_experience: 0,
    },
  });

  function toggleSpec(spec: string) {
    const newSpecs = selectedSpecs.includes(spec)
      ? selectedSpecs.filter((s) => s !== spec)
      : [...selectedSpecs, spec];
    setSelectedSpecs(newSpecs);
    setValue("specializations", newSpecs, { shouldValidate: true });
  }

  async function onSubmit(data: RegisterRecruiterInput) {
    setLoading(true);

    const { error: signUpError, data: authData } =
      await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: "recruiter",
            full_name: data.full_name,
          },
        },
      });

    if (signUpError || !authData.user) {
      toast.error("Registreringen misslyckades", {
        description: signUpError?.message || "Okänt fel",
      });
      setLoading(false);
      return;
    }

    const { error: recruiterError } = await supabase
      .from("recruiters")
      .insert({
        user_id: authData.user.id,
        headline: data.headline,
        specializations: data.specializations,
        years_experience: data.years_experience,
        linkedin_url: data.linkedin_url || null,
      });

    if (recruiterError) {
      toast.error("Kunde inte skapa rekryterarprofil", {
        description: recruiterError.message,
      });
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-50">
            <Check className="h-10 w-10 text-success-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Konto skapat!</h1>
          <p className="mb-6 text-muted-foreground">
            Ditt konto väntar på godkännande av en administratör. Du får ett
            mejl när ditt konto har aktiverats.
          </p>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
          >
            Gå till inloggning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-brand-600">
            Rekryto
          </Link>
          <div className="mt-4 flex items-center justify-center gap-2">
            <UserSearch className="h-5 w-5 text-success-500" />
            <p className="font-medium text-success-500">Rekryterarkonto</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Ditt namn
              </label>
              <input
                {...register("full_name")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Erik Eriksson"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Rubrik / Expertis
              </label>
              <input
                {...register("headline")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Senior IT-rekryterare med 10 års erfarenhet"
              />
              {errors.headline && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.headline.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Specialiseringar
              </label>
              <div className="flex flex-wrap gap-2">
                {JOB_INDUSTRIES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpec(spec)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedSpecs.includes(spec)
                        ? "border-brand-500 bg-brand-100 text-brand-600"
                        : "border-border bg-background text-muted-foreground hover:border-brand-300"
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
              {errors.specializations && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.specializations.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  År erfarenhet
                </label>
                <input
                  type="number"
                  {...register("years_experience", { valueAsNumber: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  min={0}
                  max={50}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  LinkedIn (valfritt)
                </label>
                <input
                  {...register("linkedin_url")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                E-postadress
              </label>
              <input
                type="email"
                {...register("email")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="erik@rekrytering.se"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Lösenord
              </label>
              <input
                type="password"
                {...register("password")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Minst 8 tecken"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-success-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Skapa rekryterarkonto
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Har du redan ett konto?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:underline"
          >
            Logga in
          </Link>
        </p>
      </div>
    </div>
  );
}
