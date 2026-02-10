"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/enums";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  // Company-specific
  company_id?: string;
  company_name?: string;
  // Recruiter-specific
  recruiter_id?: string;
  approval_status?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      let extra: Partial<UserProfile> = {};

      if (profile.role === "company") {
        const { data: company } = await supabase
          .from("companies")
          .select("id, company_name")
          .eq("user_id", profile.id)
          .single();
        if (company)
          extra = {
            company_id: company.id,
            company_name: company.company_name,
          };
      }

      if (profile.role === "recruiter") {
        const { data: recruiter } = await supabase
          .from("recruiters")
          .select("id, approval_status")
          .eq("user_id", profile.id)
          .single();
        if (recruiter)
          extra = {
            recruiter_id: recruiter.id,
            approval_status: recruiter.approval_status,
          };
      }

      setUser({ ...profile, ...extra } as UserProfile);
      setLoading(false);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { user, loading };
}
