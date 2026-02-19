"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RecruiterApprovalStatus, UserRole } from "@/types/enums";
import type { UserProfile } from "@/types";

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

      if (profile.role === UserRole.COMPANY) {
        const { data: company } = await supabase
          .from("companies")
          .select("id, company_name")
          .eq("user_id", profile.id)
          .single();
        if (company) {
          extra = {
            company_id: company.id,
            company_name: company.company_name,
          };
        }
      }

      if (profile.role === UserRole.RECRUITER) {
        const { data: recruiter } = await supabase
          .from("recruiters")
          .select("id, approval_status")
          .eq("user_id", profile.id)
          .single();
        if (recruiter) {
          extra = {
            recruiter_id: recruiter.id,
            approval_status: recruiter.approval_status as RecruiterApprovalStatus,
          };
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
