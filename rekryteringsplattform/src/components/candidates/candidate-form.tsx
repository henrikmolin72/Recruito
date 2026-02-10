"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  submitCandidateSchema,
  type SubmitCandidateInput,
} from "@/lib/validations/candidates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface CandidateSubmitFormProps {
  jobId: string;
  recruiterId: string;
  mandateId: string;
}

export function CandidateSubmitForm({
  jobId,
  recruiterId,
  mandateId,
}: CandidateSubmitFormProps) {
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<SubmitCandidateInput>({
    resolver: zodResolver(submitCandidateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      linkedin_url: "",
      current_title: "",
      current_company: "",
      years_experience: 0,
      expected_salary: undefined,
      cover_note: "",
      qualification_summary: "",
    },
  });

  async function onSubmit(values: SubmitCandidateInput) {
    setLoading(true);

    // Insert candidate
    const { data: candidate, error } = await supabase
      .from("candidates")
      .insert({
        job_id: jobId,
        recruiter_id: recruiterId,
        mandate_id: mandateId,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        linkedin_url: values.linkedin_url || null,
        current_title: values.current_title,
        current_company: values.current_company || null,
        years_experience: values.years_experience,
        expected_salary: values.expected_salary ?? null,
        cover_note: values.cover_note,
        qualification_summary: values.qualification_summary,
      })
      .select("id")
      .single();

    if (error || !candidate) {
      toast.error("Kunde inte skicka kandidat", { description: error?.message });
      setLoading(false);
      return;
    }

    // Upload CV if provided
    if (cvFile) {
      const ext = cvFile.name.split(".").pop();
      const path = `${candidate.id}/cv.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(path, cvFile);

      if (!uploadError) {
        await supabase
          .from("candidates")
          .update({ cv_file_path: path })
          .eq("id", candidate.id);
      }
    }

    toast.success("Kandidaten har presenterats!");
    form.reset();
    setCvFile(null);
    router.refresh();
    setLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold">Kontaktuppgifter</h3>
            <FormField control={form.control} name="first_name" render={({ field }) => (
              <FormItem><FormLabel>Förnamn</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="last_name" render={({ field }) => (
              <FormItem><FormLabel>Efternamn</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>E-post (valfritt)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Telefon (valfritt)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="linkedin_url" render={({ field }) => (
              <FormItem><FormLabel>LinkedIn (valfritt)</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Professionell info</h3>
            <FormField control={form.control} name="current_title" render={({ field }) => (
              <FormItem><FormLabel>Nuvarande titel</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="current_company" render={({ field }) => (
              <FormItem><FormLabel>Nuvarande företag (valfritt)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="years_experience" render={({ field }) => (
              <FormItem><FormLabel>Års erfarenhet</FormLabel><FormControl>
                <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="expected_salary" render={({ field }) => (
              <FormItem><FormLabel>Förväntad lön (SEK/år, valfritt)</FormLabel><FormControl>
                <Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <FormField control={form.control} name="cover_note" render={({ field }) => (
          <FormItem><FormLabel>Presentation</FormLabel><FormControl>
            <Textarea placeholder="Kort om kandidaten och varför du rekommenderar dem..." className="min-h-24" {...field} />
          </FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="qualification_summary" render={({ field }) => (
          <FormItem><FormLabel>Kvalificering</FormLabel><FormControl>
            <Textarea placeholder="Varför passar denna kandidat för tjänsten..." className="min-h-24" {...field} />
          </FormControl><FormMessage /></FormItem>
        )} />

        <Card>
          <CardContent className="pt-6">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors hover:border-brand-400">
              <Upload className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {cvFile ? cvFile.name : "Ladda upp CV (PDF, DOC, DOCX — max 10 MB)"}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size <= 10 * 1024 * 1024) {
                    setCvFile(file);
                  } else if (file) {
                    toast.error("Filen är för stor (max 10 MB)");
                  }
                }}
              />
            </label>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="bg-success-500 hover:bg-success-700">
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Presentera kandidat
        </Button>
      </form>
    </Form>
  );
}
