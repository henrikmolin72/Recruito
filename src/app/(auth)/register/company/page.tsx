"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  registerCompanySchema,
  type RegisterCompanyInput,
} from "@/lib/validations/auth";
import { JOB_INDUSTRIES } from "@/types/enums";
import { Loader2, Building2 } from "lucide-react";

export default function RegisterCompanyPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterCompanyInput>({
    resolver: zodResolver(registerCompanySchema),
  });

  async function onSubmit(data: RegisterCompanyInput) {
    setLoading(true);

    const { error: signUpError, data: authData } =
      await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: "company",
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

    const { error: companyError } = await supabase.from("companies").insert({
      user_id: authData.user.id,
      company_name: data.company_name,
      org_number: data.org_number || null,
      industry: data.industry,
      city: data.city,
    });

    if (companyError) {
      toast.error("Kunde inte skapa företagsprofil", {
        description: companyError.message,
      });
      setLoading(false);
      return;
    }

    toast.success("Konto skapat!");
    router.push("/company");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-brand-600">
            Rekryto
          </Link>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" />
            <p className="font-medium text-brand-600">Företagskonto</p>
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
                placeholder="Anna Andersson"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Företagsnamn
              </label>
              <input
                {...register("company_name")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Acme AB"
              />
              {errors.company_name && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.company_name.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Org.nummer
                </label>
                <input
                  {...register("org_number")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="556xxx-xxxx"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Stad
                </label>
                <input
                  {...register("city")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="Stockholm"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-danger-500">
                    {errors.city.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Bransch
              </label>
              <select
                {...register("industry")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Välj bransch</option>
                {JOB_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
              {errors.industry && (
                <p className="mt-1 text-sm text-danger-500">
                  {errors.industry.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                E-postadress
              </label>
              <input
                type="email"
                {...register("email")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="anna@foretag.se"
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
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Skapa företagskonto
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
