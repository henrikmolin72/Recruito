export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "company" | "recruiter" | "admin";
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: "company" | "recruiter" | "admin";
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "company" | "recruiter" | "admin";
          email?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          org_number: string | null;
          description: string | null;
          industry: string | null;
          website: string | null;
          logo_url: string | null;
          city: string | null;
          country: string | null;
          employee_count: string | null;
          billing_email: string | null;
          billing_address: string | null;
          is_verified: boolean | null;
          stripe_customer_id: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_clearing_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          org_number?: string | null;
          description?: string | null;
          industry?: string | null;
          website?: string | null;
          logo_url?: string | null;
          city?: string | null;
          country?: string | null;
          employee_count?: string | null;
          billing_email?: string | null;
          billing_address?: string | null;
          is_verified?: boolean | null;
          stripe_customer_id?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_clearing_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          org_number?: string | null;
          description?: string | null;
          industry?: string | null;
          website?: string | null;
          logo_url?: string | null;
          city?: string | null;
          country?: string | null;
          employee_count?: string | null;
          billing_email?: string | null;
          billing_address?: string | null;
          is_verified?: boolean | null;
          stripe_customer_id?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_clearing_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recruiters: {
        Row: {
          id: string;
          user_id: string;
          headline: string | null;
          bio: string | null;
          specializations: string[] | null;
          locations: string[] | null;
          years_experience: number | null;
          linkedin_url: string | null;
          approval_status: "pending" | "approved" | "rejected" | "suspended";
          approved_at: string | null;
          approved_by: string | null;
          rating: number | null;
          total_placements: number | null;
          stripe_connect_id: string | null;
          stripe_onboarding_complete: boolean | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_clearing_number: string | null;
          payout_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          headline?: string | null;
          bio?: string | null;
          specializations?: string[] | null;
          locations?: string[] | null;
          years_experience?: number | null;
          linkedin_url?: string | null;
          approval_status?: "pending" | "approved" | "rejected" | "suspended";
          approved_at?: string | null;
          approved_by?: string | null;
          rating?: number | null;
          total_placements?: number | null;
          stripe_connect_id?: string | null;
          stripe_onboarding_complete?: boolean | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_clearing_number?: string | null;
          payout_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          headline?: string | null;
          bio?: string | null;
          specializations?: string[] | null;
          locations?: string[] | null;
          years_experience?: number | null;
          linkedin_url?: string | null;
          approval_status?: "pending" | "approved" | "rejected" | "suspended";
          approved_at?: string | null;
          approved_by?: string | null;
          rating?: number | null;
          total_placements?: number | null;
          stripe_connect_id?: string | null;
          stripe_onboarding_complete?: boolean | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_clearing_number?: string | null;
          payout_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string;
          requirements: string | null;
          nice_to_have: string | null;
          industry: string;
          location: string;
          employment_type: string;
          remote_policy: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          fee_percentage: number;
          max_recruiters: number;
          current_recruiter_count: number;
          status: "draft" | "active" | "paused" | "filled" | "closed" | "cancelled";
          published_at: string | null;
          filled_at: string | null;
          closed_at: string | null;
          is_exclusive: boolean | null;
          exclusivity_end_date: string | null;
          exclusivity_accepted: boolean | null;
          show_interview_bonus: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description: string;
          requirements?: string | null;
          nice_to_have?: string | null;
          industry: string;
          location: string;
          employment_type?: string;
          remote_policy?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          fee_percentage?: number;
          max_recruiters?: number;
          current_recruiter_count?: number;
          status?: "draft" | "active" | "paused" | "filled" | "closed" | "cancelled";
          published_at?: string | null;
          filled_at?: string | null;
          closed_at?: string | null;
          is_exclusive?: boolean | null;
          exclusivity_end_date?: string | null;
          exclusivity_accepted?: boolean | null;
          show_interview_bonus?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          description?: string;
          requirements?: string | null;
          nice_to_have?: string | null;
          industry?: string;
          location?: string;
          employment_type?: string;
          remote_policy?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          fee_percentage?: number;
          max_recruiters?: number;
          current_recruiter_count?: number;
          status?: "draft" | "active" | "paused" | "filled" | "closed" | "cancelled";
          published_at?: string | null;
          filled_at?: string | null;
          closed_at?: string | null;
          is_exclusive?: boolean | null;
          exclusivity_end_date?: string | null;
          exclusivity_accepted?: boolean | null;
          show_interview_bonus?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_mandates: {
        Row: {
          id: string;
          job_id: string;
          recruiter_id: string;
          is_active: boolean;
          claimed_at: string;
          released_at: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          recruiter_id: string;
          is_active?: boolean;
          claimed_at?: string;
          released_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          recruiter_id?: string;
          is_active?: boolean;
          claimed_at?: string;
          released_at?: string | null;
        };
      };
      candidates: {
        Row: {
          id: string;
          job_id: string;
          recruiter_id: string;
          mandate_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          current_title: string | null;
          current_company: string | null;
          years_experience: number | null;
          expected_salary: number | null;
          cv_file_path: string | null;
          cover_note: string | null;
          qualification_summary: string | null;
          status: "submitted" | "reviewing" | "interview" | "offered" | "hired" | "guarantee_period" | "completed" | "rejected" | "declined";
          status_changed_at: string | null;
          rejection_reason: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          interview_at: string | null;
          offered_at: string | null;
          hired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          recruiter_id: string;
          mandate_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          current_title?: string | null;
          current_company?: string | null;
          years_experience?: number | null;
          expected_salary?: number | null;
          cv_file_path?: string | null;
          cover_note?: string | null;
          qualification_summary?: string | null;
          status?: "submitted" | "reviewing" | "interview" | "offered" | "hired" | "guarantee_period" | "completed" | "rejected" | "declined";
          status_changed_at?: string | null;
          rejection_reason?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          interview_at?: string | null;
          offered_at?: string | null;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          recruiter_id?: string;
          mandate_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          current_title?: string | null;
          current_company?: string | null;
          years_experience?: number | null;
          expected_salary?: number | null;
          cv_file_path?: string | null;
          cover_note?: string | null;
          qualification_summary?: string | null;
          status?: "submitted" | "reviewing" | "interview" | "offered" | "hired" | "guarantee_period" | "completed" | "rejected" | "declined";
          status_changed_at?: string | null;
          rejection_reason?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          interview_at?: string | null;
          offered_at?: string | null;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      placements: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          company_id: string;
          recruiter_id: string;
          annual_salary: number;
          salary_currency: string | null;
          fee_percentage: number;
          total_fee: number;
          platform_fee: number;
          recruiter_fee: number;
          status: "confirmed" | "invoice_sent" | "payment_received" | "guarantee_active" | "payout_released" | "guarantee_failed" | "refund_processing";
          start_date: string;
          guarantee_end_date: string;
          stripe_payment_intent_id: string | null;
          stripe_invoice_id: string | null;
          stripe_payout_id: string | null;
          bank_reference: string | null;
          invoice_number: string | null;
          invoice_due_date: string | null;
          payout_bank_reference: string | null;
          payout_method: string | null;
          invoice_sent_at: string | null;
          payment_received_at: string | null;
          payout_released_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id: string;
          company_id: string;
          recruiter_id: string;
          annual_salary: number;
          salary_currency?: string | null;
          fee_percentage: number;
          total_fee: number;
          platform_fee: number;
          recruiter_fee: number;
          status?: "confirmed" | "invoice_sent" | "payment_received" | "guarantee_active" | "payout_released" | "guarantee_failed" | "refund_processing";
          start_date: string;
          guarantee_end_date: string;
          stripe_payment_intent_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payout_id?: string | null;
          bank_reference?: string | null;
          invoice_number?: string | null;
          invoice_due_date?: string | null;
          payout_bank_reference?: string | null;
          payout_method?: string | null;
          invoice_sent_at?: string | null;
          payment_received_at?: string | null;
          payout_released_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string;
          company_id?: string;
          recruiter_id?: string;
          annual_salary?: number;
          salary_currency?: string | null;
          fee_percentage?: number;
          total_fee?: number;
          platform_fee?: number;
          recruiter_fee?: number;
          status?: "confirmed" | "invoice_sent" | "payment_received" | "guarantee_active" | "payout_released" | "guarantee_failed" | "refund_processing";
          start_date?: string;
          guarantee_end_date?: string;
          stripe_payment_intent_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payout_id?: string | null;
          bank_reference?: string | null;
          invoice_number?: string | null;
          invoice_due_date?: string | null;
          payout_bank_reference?: string | null;
          payout_method?: string | null;
          invoice_sent_at?: string | null;
          payment_received_at?: string | null;
          payout_released_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      interview_bonuses: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          recruiter_id: string;
          bonus_type: string;
          amount_eur: number;
          status: string;
          approved_at: string | null;
          paid_at: string | null;
          bank_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id: string;
          recruiter_id: string;
          bonus_type: string;
          amount_eur?: number;
          status?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          bank_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string;
          recruiter_id?: string;
          bonus_type?: string;
          amount_eur?: number;
          status?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          bank_reference?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          job_id: string | null;
          candidate_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          candidate_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          candidate_id?: string | null;
          created_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_system_message: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_system_message?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          is_system_message?: boolean | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          link: string | null;
          is_read: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          link?: string | null;
          is_read?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          link?: string | null;
          is_read?: boolean | null;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      candidate_ownership: {
        Row: {
          id: string;
          candidate_id: string;
          recruiter_id: string;
          company_id: string;
          job_id: string;
          candidate_email: string | null;
          candidate_name: string;
          ownership_start: string;
          ownership_end: string;
          status: string;
          claimed_placement_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          recruiter_id: string;
          company_id: string;
          job_id: string;
          candidate_email?: string | null;
          candidate_name: string;
          ownership_start?: string;
          ownership_end?: string;
          status?: string;
          claimed_placement_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          recruiter_id?: string;
          company_id?: string;
          job_id?: string;
          candidate_email?: string | null;
          candidate_name?: string;
          ownership_start?: string;
          ownership_end?: string;
          status?: string;
          claimed_placement_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_role: {
        Args: Record<string, never>;
        Returns: "company" | "recruiter" | "admin";
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_recruiter_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: "company" | "recruiter" | "admin";
      job_status: "draft" | "active" | "paused" | "filled" | "closed" | "cancelled";
      candidate_status: "submitted" | "reviewing" | "interview" | "offered" | "hired" | "guarantee_period" | "completed" | "rejected" | "declined";
      placement_status: "confirmed" | "invoice_sent" | "payment_received" | "guarantee_active" | "payout_released" | "guarantee_failed" | "refund_processing";
      recruiter_approval: "pending" | "approved" | "rejected" | "suspended";
    };
  };
};

// Convenience type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// Commonly used row types
export type Profile = Tables<"profiles">;
export type Company = Tables<"companies">;
export type Recruiter = Tables<"recruiters">;
export type Job = Tables<"jobs">;
export type JobMandate = Tables<"job_mandates">;
export type Candidate = Tables<"candidates">;
export type Placement = Tables<"placements">;
export type Conversation = Tables<"conversations">;
export type ConversationParticipant = Tables<"conversation_participants">;
export type Message = Tables<"messages">;
export type Notification = Tables<"notifications">;
export type ActivityLog = Tables<"activity_log">;
export type InterviewBonus = Tables<"interview_bonuses">;
export type CandidateOwnership = Tables<"candidate_ownership">;
