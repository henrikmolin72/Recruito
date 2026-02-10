"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  registerRecruiterSchema,
  type RegisterRecruiterInput,
} from "@/lib/validations/auth";
import { JOB_INDUSTRIES } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

export function RegisterRecruiterForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<RegisterRecruiterInput>({
    resolver: zodResolver(registerRecruiterSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      headline: "",
      specializations: [],
      years_experience: 0,
      linkedin_url: "",
    },
  });

  const specializations = form.watch("specializations");

  function toggleSpecialization(spec: string) {
    const current = form.getValues("specializations");
    if (current.includes(spec)) {
      form.setValue(
        "specializations",
        current.filter((s) => s !== spec),
        { shouldValidate: true }
      );
    } else {
      form.setValue("specializations", [...current, spec], {
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(values: RegisterRecruiterInput) {
    setLoading(true);

    const { error: signUpError, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: "recruiter",
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

    const { error: recruiterError } = await supabase
      .from("recruiters")
      .insert({
        user_id: data.user.id,
        headline: values.headline,
        specializations: values.specializations,
        years_experience: values.years_experience,
        linkedin_url: values.linkedin_url || null,
      });

    if (recruiterError) {
      toast.error("Kunde inte skapa rekryterarprofil", {
        description: recruiterError.message,
      });
      setLoading(false);
      return;
    }

    toast.success("Kontot har skapats!", {
      description: "Din ansökan granskas av en administratör.",
    });
    router.push("/recruiter");
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
                  <Input placeholder="Erik Eriksson" {...field} />
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
                  <Input type="email" placeholder="erik@email.se" {...field} />
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
          name="headline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headline</FormLabel>
              <FormControl>
                <Input
                  placeholder="T.ex. Senior IT-rekryterare med 10 års erfarenhet"
                  {...field}
                />
              </FormControl>
              <FormDescription>Kort beskrivning av din expertis</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specializations"
          render={() => (
            <FormItem>
              <FormLabel>Specialiseringar</FormLabel>
              <div className="flex flex-wrap gap-2">
                {JOB_INDUSTRIES.map((industry) => (
                  <Badge
                    key={industry}
                    variant={
                      specializations.includes(industry)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleSpecialization(industry)}
                  >
                    {industry}
                    {specializations.includes(industry) && (
                      <X className="ml-1 size-3" />
                    )}
                  </Badge>
                ))}
              </div>
              <FormDescription>Välj de branscher du rekryterar inom</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="years_experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Års erfarenhet</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="linkedin_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn (valfritt)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://linkedin.com/in/ditt-namn"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Skapa rekryterarkonto
        </Button>
      </form>
    </Form>
  );
}
