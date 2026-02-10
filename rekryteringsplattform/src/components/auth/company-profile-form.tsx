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
import {
  Form,
  FormControl,
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const companyProfileSchema = z.object({
  full_name: z.string().min(2),
  company_name: z.string().min(2),
  org_number: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  city: z.string().optional(),
  country: z.string().optional(),
  employee_count: z.string().optional(),
  billing_email: z.string().email().optional().or(z.literal("")),
  billing_address: z.string().optional(),
});

type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

interface CompanyProfileFormProps {
  profile: { id: string; full_name: string };
  company: {
    id: string;
    company_name: string;
    org_number: string | null;
    description: string | null;
    industry: string | null;
    website: string | null;
    city: string | null;
    country: string | null;
    employee_count: string | null;
    billing_email: string | null;
    billing_address: string | null;
  };
}

export function CompanyProfileForm({ profile, company }: CompanyProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      full_name: profile.full_name,
      company_name: company.company_name,
      org_number: company.org_number ?? "",
      description: company.description ?? "",
      industry: company.industry ?? "",
      website: company.website ?? "",
      city: company.city ?? "",
      country: company.country ?? "SE",
      employee_count: company.employee_count ?? "",
      billing_email: company.billing_email ?? "",
      billing_address: company.billing_address ?? "",
    },
  });

  async function onSubmit(values: CompanyProfileInput) {
    setLoading(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: values.full_name })
      .eq("id", profile.id);

    const { error: companyError } = await supabase
      .from("companies")
      .update({
        company_name: values.company_name,
        org_number: values.org_number || null,
        description: values.description || null,
        industry: values.industry || null,
        website: values.website || null,
        city: values.city || null,
        country: values.country || null,
        employee_count: values.employee_count || null,
        billing_email: values.billing_email || null,
        billing_address: values.billing_address || null,
      })
      .eq("id", company.id);

    if (profileError || companyError) {
      toast.error("Kunde inte uppdatera profilen");
      setLoading(false);
      return;
    }

    toast.success("Profilen har uppdaterats");
    router.refresh();
    setLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ditt namn</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Företagsnamn</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="org_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organisationsnummer</FormLabel>
              <FormControl><Input placeholder="556123-4567" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beskrivning</FormLabel>
              <FormControl><Textarea placeholder="Berätta om ert företag..." className="min-h-24" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bransch</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {JOB_INDUSTRIES.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {JOB_LOCATIONS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webbplats</FormLabel>
                <FormControl><Input placeholder="https://www.foretag.se" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Land</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="SE">Sverige</SelectItem>
                    <SelectItem value="NO">Norge</SelectItem>
                    <SelectItem value="DK">Danmark</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="employee_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Antal anställda</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="500+">500+</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billing_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fakturerings-e-post</FormLabel>
              <FormControl><Input type="email" placeholder="faktura@foretag.se" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Faktureringsadress</FormLabel>
              <FormControl><Textarea placeholder="Gata, postnr, stad..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Spara ändringar
        </Button>
      </form>
    </Form>
  );
}
