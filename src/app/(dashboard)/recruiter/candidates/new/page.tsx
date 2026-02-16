"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import {
  submitCandidateSchema,
  type SubmitCandidateInput,
} from "@/lib/validations/job";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SubmitCandidatePage() {
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const supabase = createClient();

  const mandateId = searchParams.get("mandate");
  const jobId = searchParams.get("job");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmitCandidateInput>({
    resolver: zodResolver(submitCandidateSchema),
  });

  useEffect(() => {
    if (!jobId) return;
    async function fetchJobTitle() {
      const { data } = await supabase
        .from("jobs")
        .select("title")
        .eq("id", jobId)
        .single();
      if (data) setJobTitle(data.title);
    }
    fetchJobTitle();
  }, [jobId]);

  async function onSubmit(data: SubmitCandidateInput) {
    if (!user?.recruiter_id || !mandateId || !jobId) {
      toast.error("Saknar nödvändig information");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("candidates").insert({
      job_id: jobId,
      recruiter_id: user.recruiter_id,
      mandate_id: mandateId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || null,
      phone: data.phone || null,
      linkedin_url: data.linkedin_url || null,
      current_title: data.current_title || null,
      current_company: data.current_company || null,
      years_experience: data.years_experience ?? null,
      expected_salary: data.expected_salary ?? null,
      cover_note: data.cover_note,
      qualification_summary: data.qualification_summary || null,
    });

    if (error) {
      toast.error("Kunde inte skicka kandidaten", {
        description: error.message,
      });
      setLoading(false);
      return;
    }

    toast.success("Kandidat presenterad!");
    router.push("/recruiter/mandates");
  }

  if (!mandateId || !jobId) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold">Mandat saknas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gå till dina mandat och välj ett jobb att presentera kandidat för.
        </p>
        <Link
          href="/recruiter/mandates"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
        >
          Mina mandat
        </Link>
      </div>
    );
  }

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/recruiter/mandates"
          className="rounded-md p-2 text-muted-foreground hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Presentera kandidat</h1>
          {jobTitle && (
            <p className="text-muted-foreground">Till: {jobTitle}</p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border bg-card p-6"
      >
        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Förnamn *
            </label>
            <input
              {...register("first_name")}
              className={inputClass}
              placeholder="Anna"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-danger-500">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Efternamn *
            </label>
            <input
              {...register("last_name")}
              className={inputClass}
              placeholder="Andersson"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-danger-500">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-post</label>
            <input
              type="email"
              {...register("email")}
              className={inputClass}
              placeholder="anna@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Telefon</label>
            <input
              {...register("phone")}
              className={inputClass}
              placeholder="+46 70 123 45 67"
            />
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">LinkedIn</label>
          <input
            {...register("linkedin_url")}
            className={inputClass}
            placeholder="https://linkedin.com/in/anna-andersson"
          />
        </div>

        {/* Current position */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Nuvarande titel
            </label>
            <input
              {...register("current_title")}
              className={inputClass}
              placeholder="Senior Utvecklare"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Nuvarande företag
            </label>
            <input
              {...register("current_company")}
              className={inputClass}
              placeholder="Acme AB"
            />
          </div>
        </div>

        {/* Experience and salary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              År erfarenhet
            </label>
            <input
              type="number"
              {...register("years_experience", { valueAsNumber: true })}
              className={inputClass}
              min={0}
              max={50}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Löneanspråk (SEK/år)
            </label>
            <input
              type="number"
              {...register("expected_salary", { valueAsNumber: true })}
              className={inputClass}
              placeholder="650000"
            />
          </div>
        </div>

        {/* Cover note */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Motivering / Cover note *
          </label>
          <textarea
            {...register("cover_note")}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Beskriv varför denna kandidat är rätt för rollen..."
          />
          {errors.cover_note && (
            <p className="mt-1 text-sm text-danger-500">
              {errors.cover_note.message}
            </p>
          )}
        </div>

        {/* Qualification summary */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Kvalifikationssammanfattning
          </label>
          <textarea
            {...register("qualification_summary")}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Kort sammanfattning av kandidatens nyckelkvalifikationer..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4 border-t pt-6">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Presentera kandidat
          </button>
          <Link
            href="/recruiter/mandates"
            className="inline-flex h-10 items-center justify-center rounded-md border px-6 text-sm font-medium text-muted-foreground hover:bg-gray-100"
          >
            Avbryt
          </Link>
        </div>
      </form>
    </div>
  );
}
