"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  registerCompanySchema,
  type RegisterCompanyInput,
} from "@/lib/validations/auth";
import { JOB_INDUSTRIES, JOB_LOCATIONS } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function RegisterCompanyForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<RegisterCompanyInput>({
    resolver: zodResolver(registerCompanySchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      company_name: "",
      org_number: "",
      industry: "",
      city: "",
    },
  });

  async function onSubmit(values: RegisterCompanyInput) {
    setLoading(true);

    const { error: signUpError, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: "company",
          full_name: values.full_name,
        },
      },
    });

    if (signUpError || !data.user) {
      toast.error("Registreringen misslyckades", {
        description: signUpError?.message ?? "Något gick fel",
      });
      setLoading(false);
      return;
    }

    const { error: companyError } = await supabase.from("companies").insert({
      user_id: data.user.id,
      company_name: values.company_name,
      org_number: values.org_number || null,
      industry: values.industry,
      city: values.city,
    });

    if (companyError) {
      toast.error("Kunde inte skapa företagsprofil", {
        description: companyError.message,
      });
      setLoading(false);
      return;
    }

    toast.success("Kontot har skapats!");
    router.push("/company");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ditt namn</FormLabel>
                <FormControl>
                  <Input placeholder="Anna Andersson" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-postadress</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="anna@foretag.se" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lösenord</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Minst 8 tecken" {...field} />
              </FormControl>
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
              <FormControl>
                <Input placeholder="Företaget AB" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="org_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organisationsnummer (valfritt)</FormLabel>
              <FormControl>
                <Input placeholder="556123-4567" {...field} />
              </FormControl>
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
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj bransch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
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
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj stad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Skapa företagskonto
        </Button>
      </form>
    </Form>
  );
}
