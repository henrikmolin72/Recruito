"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { createJobSchema, type CreateJobInput } from "@/lib/validations/job";
import {
  JOB_INDUSTRIES,
  JOB_LOCATIONS,
  EMPLOYMENT_TYPES,
} from "@/types/enums";
import { Loader2, ArrowLeft } from "lucide-react";

export default function CreateJobPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      fee_percentage: 15,
      max_recruiters: 5,
      employment_type: "Heltid",
    },
  });

  async function onSubmit(data: CreateJobInput) {
    if (!user?.company_id) {
      toast.error("Företagsprofil saknas");
      return;
    }

    setLoading(true);

    const { error, data: job } = await supabase
      .from("jobs")
      .insert({
        company_id: user.company_id,
        title: data.title,
        description: data.description,
        requirements: data.requirements || null,
        nice_to_have: data.nice_to_have || null,
        industry: data.industry,
        location: data.location,
        employment_type: data.employment_type,
        remote_policy: data.remote_policy || null,
        salary_min: data.salary_min || null,
        salary_max: data.salary_max || null,
        fee_percentage: data.fee_percentage,
        max_recruiters: data.max_recruiters,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Kunde inte skapa jobbet", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("Jobbet skapat som utkast!");
    router.push(`/company/jobs/${job.id}`);
  }

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const textareaClass =
    "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/company/jobs"
          className="rounded-md p-2 text-muted-foreground hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Skapa nytt jobb</h1>
          <p className="text-muted-foreground">
            Fyll i detaljerna för din jobbannons
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border bg-card p-6"
      >
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Jobbtitel *
          </label>
          <input
            {...register("title")}
            className={inputClass}
            placeholder="t.ex. Senior Fullstack-utvecklare"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-danger-500">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Beskrivning *
          </label>
          <textarea
            {...register("description")}
            className={textareaClass}
            placeholder="Beskriv rollen, teamet och vad ni erbjuder..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-danger-500">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Requirements */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Kravprofil
          </label>
          <textarea
            {...register("requirements")}
            className={textareaClass}
            placeholder="Vilka kvalifikationer och erfarenheter krävs?"
          />
        </div>

        {/* Nice to have */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Meriterande
          </label>
          <textarea
            {...register("nice_to_have")}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Ytterligare kvalifikationer som är meriterande..."
          />
        </div>

        {/* Industry, Location, Employment type */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Bransch *
            </label>
            <select {...register("industry")} className={inputClass}>
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
              Plats *
            </label>
            <select {...register("location")} className={inputClass}>
              <option value="">Välj plats</option>
              {JOB_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {errors.location && (
              <p className="mt-1 text-sm text-danger-500">
                {errors.location.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Anställningstyp *
            </label>
            <select {...register("employment_type")} className={inputClass}>
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Remote policy */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Distanspolicy
          </label>
          <select {...register("remote_policy")} className={inputClass}>
            <option value="">Ej specificerat</option>
            <option value="Kontor">Enbart kontor</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Remote">Helt remote</option>
          </select>
        </div>

        {/* Salary range */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Lön från (SEK/år)
            </label>
            <input
              type="number"
              {...register("salary_min", { valueAsNumber: true })}
              className={inputClass}
              placeholder="400000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Lön till (SEK/år)
            </label>
            <input
              type="number"
              {...register("salary_max", { valueAsNumber: true })}
              className={inputClass}
              placeholder="700000"
            />
          </div>
        </div>

        {/* Fee and max recruiters */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Avgift (% av årslön)
            </label>
            <input
              type="number"
              {...register("fee_percentage", { valueAsNumber: true })}
              className={inputClass}
              min={5}
              max={25}
              step={0.5}
            />
            {errors.fee_percentage && (
              <p className="mt-1 text-sm text-danger-500">
                {errors.fee_percentage.message}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Standard: 15%. Högre avgift kan attrahera fler rekryterare.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Max antal rekryterare
            </label>
            <input
              type="number"
              {...register("max_recruiters", { valueAsNumber: true })}
              className={inputClass}
              min={1}
              max={10}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Hur många rekryterare som kan ta uppdraget samtidigt.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 border-t pt-6">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Spara som utkast
          </button>
          <Link
            href="/company/jobs"
            className="inline-flex h-10 items-center justify-center rounded-md border px-6 text-sm font-medium text-muted-foreground hover:bg-gray-100"
          >
            Avbryt
          </Link>
        </div>
      </form>
    </div>
  );
}
