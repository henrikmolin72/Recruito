"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { JOB_INDUSTRIES, JOB_LOCATIONS } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

const recruiterProfileSchema = z.object({
  full_name: z.string().min(2),
  headline: z.string().min(10, "Beskriv din expertis kort"),
  bio: z.string().optional(),
  specializations: z.array(z.string()).min(1, "Välj minst en"),
  locations: z.array(z.string()).min(1, "Välj minst en plats"),
  years_experience: z.number().min(0).max(50),
  linkedin_url: z.string().url().optional().or(z.literal("")),
});

type RecruiterProfileInput = z.infer<typeof recruiterProfileSchema>;

interface RecruiterProfileFormProps {
  profile: { id: string; full_name: string };
  recruiter: {
    id: string;
    headline: string | null;
    bio: string | null;
    specializations: string[] | null;
    locations: string[] | null;
    years_experience: number | null;
    linkedin_url: string | null;
  };
}

export function RecruiterProfileForm({ profile, recruiter }: RecruiterProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<RecruiterProfileInput>({
    resolver: zodResolver(recruiterProfileSchema),
    defaultValues: {
      full_name: profile.full_name,
      headline: recruiter.headline ?? "",
      bio: recruiter.bio ?? "",
      specializations: recruiter.specializations ?? [],
      locations: recruiter.locations ?? [],
      years_experience: recruiter.years_experience ?? 0,
      linkedin_url: recruiter.linkedin_url ?? "",
    },
  });

  const specializations = form.watch("specializations");
  const locations = form.watch("locations");

  function toggleItem(field: "specializations" | "locations", item: string) {
    const current = form.getValues(field);
    form.setValue(field, current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item], { shouldValidate: true });
  }

  async function onSubmit(values: RecruiterProfileInput) {
    setLoading(true);
    await supabase.from("profiles").update({ full_name: values.full_name }).eq("id", profile.id);
    const { error } = await supabase.from("recruiters").update({
      headline: values.headline,
      bio: values.bio || null,
      specializations: values.specializations,
      locations: values.locations,
      years_experience: values.years_experience,
      linkedin_url: values.linkedin_url || null,
    }).eq("id", recruiter.id);

    if (error) { toast.error("Kunde inte uppdatera profilen"); setLoading(false); return; }
    toast.success("Profilen har uppdaterats");
    router.refresh();
    setLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="full_name" render={({ field }) => (
          <FormItem><FormLabel>Namn</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="headline" render={({ field }) => (
          <FormItem><FormLabel>Headline</FormLabel><FormControl><Input placeholder="T.ex. Senior IT-rekryterare" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="bio" render={({ field }) => (
          <FormItem><FormLabel>Om dig</FormLabel><FormControl><Textarea placeholder="Berätta om din erfarenhet..." className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="specializations" render={() => (
          <FormItem>
            <FormLabel>Specialiseringar</FormLabel>
            <div className="flex flex-wrap gap-2">
              {JOB_INDUSTRIES.map((i) => (
                <Badge key={i} variant={specializations.includes(i) ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => toggleItem("specializations", i)}>
                  {i}{specializations.includes(i) && <X className="ml-1 size-3" />}
                </Badge>
              ))}
            </div><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="locations" render={() => (
          <FormItem>
            <FormLabel>Platser</FormLabel>
            <div className="flex flex-wrap gap-2">
              {JOB_LOCATIONS.map((l) => (
                <Badge key={l} variant={locations.includes(l) ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => toggleItem("locations", l)}>
                  {l}{locations.includes(l) && <X className="ml-1 size-3" />}
                </Badge>
              ))}
            </div><FormMessage />
          </FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="years_experience" render={({ field }) => (
            <FormItem><FormLabel>Års erfarenhet</FormLabel><FormControl>
              <Input type="number" min={0} max={50} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="linkedin_url" render={({ field }) => (
            <FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Spara ändringar
        </Button>
      </form>
    </Form>
  );
}
