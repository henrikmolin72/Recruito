"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { createJobSchema, type CreateJobInput } from "@/lib/validations/jobs";
import {
  JOB_INDUSTRIES,
  JOB_LOCATIONS,
  EMPLOYMENT_TYPES,
} from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeeCalculator } from "./fee-calculator";
import { ExclusivityPrompt } from "./exclusivity-prompt";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface JobFormProps {
  companyId: string;
  initialData?: Partial<CreateJobInput> & { id?: string };
}

export function JobForm({ companyId, initialData }: JobFormProps) {
  const [loading, setLoading] = useState(false);
  const [isExclusive, setIsExclusive] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!initialData?.id;

  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      requirements: initialData?.requirements ?? "",
      nice_to_have: initialData?.nice_to_have ?? "",
      industry: initialData?.industry ?? "",
      location: initialData?.location ?? "",
      employment_type: initialData?.employment_type ?? "Heltid",
      remote_policy: initialData?.remote_policy ?? "",
      salary_min: initialData?.salary_min ?? undefined,
      salary_max: initialData?.salary_max ?? undefined,
      fee_percentage: initialData?.fee_percentage ?? 15,
      max_recruiters: initialData?.max_recruiters ?? 5,
    },
  });

  const salaryMin = form.watch("salary_min");
  const salaryMax = form.watch("salary_max");
  const feePercentage = form.watch("fee_percentage");

  async function onSubmit(values: CreateJobInput, status: "draft" | "active") {
    setLoading(true);

    const exclusivityEndDate = isExclusive
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const jobData = {
      ...values,
      company_id: companyId,
      status,
      published_at: status === "active" ? new Date().toISOString() : null,
      is_exclusive: isExclusive,
      exclusivity_end_date: exclusivityEndDate,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase
        .from("jobs")
        .update(jobData)
        .eq("id", initialData!.id!));
    } else {
      ({ error } = await supabase.from("jobs").insert(jobData));
    }

    if (error) {
      toast.error("Kunde inte spara jobbet", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success(
      status === "active" ? "Jobbet har publicerats!" : "Utkastet har sparats"
    );
    router.push("/company/jobs");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        {/* Section: Basic info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Grundinformation</h2>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jobbtitel</FormLabel>
                <FormControl>
                  <Input placeholder="T.ex. Senior Frontend-utvecklare" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bransch</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj bransch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JOB_INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plats</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj plats" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JOB_LOCATIONS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anställningstyp</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="remote_policy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remote-policy (valfritt)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj policy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="På plats">På plats</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section: Description */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Beskrivning</h2>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tjänstebeskrivning</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Beskriv rollen, teamet och vad personen kommer att arbeta med..."
                    className="min-h-32"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="requirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Krav</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Vilka kvalifikationer krävs för rollen..."
                    className="min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nice_to_have"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meriterande (valfritt)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Övriga meriter som är ett plus..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section: Salary & Fee */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Lön & avgift</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="salary_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lön från (SEK/år)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="400000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salary_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lön till (SEK/år)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="600000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fee_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avgift (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={25}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Procent av kandidatens årslön (5-25%)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_recruiters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max antal rekryterare</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Hur många rekryterare som kan arbeta med jobbet (1-10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FeeCalculator
            salaryMin={salaryMin}
            salaryMax={salaryMax}
            feePercentage={feePercentage}
          />
        </div>

        {/* Section: Exclusivity */}
        <ExclusivityPrompt isExclusive={isExclusive} onChange={setIsExclusive} />

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={form.handleSubmit((v) => onSubmit(v, "draft"))}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Spara som utkast
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={form.handleSubmit((v) => onSubmit(v, "active"))}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Publicera
          </Button>
        </div>
      </form>
    </Form>
  );
}
