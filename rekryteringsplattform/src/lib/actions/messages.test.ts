import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Unit tests for the messaging privacy split (Task 2). These prove the
// load-bearing routing + authorization decisions against mocked Supabase
// clients (the repo has no DB-integration harness; full wiring is covered by
// the Task 5 e2e):
//   (a) a company-sent recruito message → 'recruito_company', sole participant
//       is the company user.
//   (b) a recruiter-sent recruito message → 'recruito_recruiter', sole
//       participant is the recruiter user.
//   (c) getCandidateConversation resolves sender full_name for a message
//       authored by the OTHER role via the service-role client (no "Unknown").
//   (d) getCandidateConversation denies (returns null) for a user who is
//       neither a participant nor an admin (IDOR guard).
// ---------------------------------------------------------------------------

// Identities used across tests.
const COMPANY_USER = "company-user-1";
const RECRUITER_USER = "recruiter-user-1";
const ADMIN_USER = "admin-user-1";
const STRANGER_USER = "stranger-user-1";
const CANDIDATE_ID = "cand-1";
const JOB_ID = "job-1";

// The candidate→recruiter/company resolution fixture (shape mirrors the
// Supabase nested-join the action requests).
const candidateRow: any = {
  mandate_id: "mand-1",
  recruiter: { user_id: RECRUITER_USER },
  job: { id: JOB_ID, company: { user_id: COMPANY_USER } },
};

// Per-test state.
let currentUserId: string | null = null;
let conversationsStore: any[] = []; // rows: { id, candidate_id, job_id, conversation_type, created_at }
let participantsStore: Array<{ conversation_id: string; user_id: string }> = [];
let messagesStore: any[] = []; // { id, conversation_id, sender_id, content, created_at, is_system_message }
let profilesStore: Record<string, { id: string; full_name: string; role: string }> = {};
const inserts: Array<{ table: string; payload: any }> = [];
let convIdSeq = 0;

// Build a chainable client. `asService` true means RLS is bypassed (sees all
// rows); false means the user-scoped client (still used for candidate
// resolution + message insert here, which we don't gate in the mock).
function makeClient(asService: boolean) {
  function from(table: string) {
    const filters: Record<string, any> = {};
    let op: "select" | "insert" | "upsert" | "update" = "select";
    let payload: any = null;
    let upsertOpts: any = null;

    const applyFilters = (rows: any[]) =>
      rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));

    const selectRows = (): any[] => {
      if (table === "candidates") return candidateRow ? [candidateRow] : [];
      if (table === "conversations") return applyFilters(conversationsStore);
      if (table === "conversation_participants") return applyFilters(participantsStore);
      if (table === "messages") return applyFilters(messagesStore);
      if (table === "profiles") {
        const all = Object.values(profilesStore);
        if (filters.id) return all.filter((p) => p.id === filters.id);
        if (Array.isArray(filters.__in_id)) return all.filter((p) => filters.__in_id.includes(p.id));
        return all;
      }
      return [];
    };

    const chain: any = {
      select: () => chain,
      eq: (col: string, val: any) => { filters[col] = val; return chain; },
      in: (col: string, vals: any[]) => {
        if (col === "id") filters.__in_id = vals;
        else filters[col] = vals;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      insert: (p: any) => { op = "insert"; payload = p; inserts.push({ table, payload: p }); return chain; },
      upsert: (p: any, opts: any) => { op = "upsert"; payload = p; upsertOpts = opts; inserts.push({ table, payload: p }); return chain; },
      update: (p: any) => { op = "update"; payload = p; return chain; },
      single: async () => {
        if (op === "insert" && table === "conversations") {
          const row = { id: `conv-${++convIdSeq}`, created_at: new Date().toISOString(), ...payload };
          conversationsStore.push(row);
          return { data: row, error: null };
        }
        const rows = selectRows();
        return { data: rows[0] ?? null, error: rows[0] ? null : { code: "PGRST116" } };
      },
      maybeSingle: async () => {
        const rows = selectRows();
        return { data: rows[0] ?? null, error: null };
      },
      then: (resolve: any, reject: any) => {
        if (op === "upsert" && table === "conversation_participants") {
          for (const r of payload as any[]) {
            if (!participantsStore.some((p) => p.conversation_id === r.conversation_id && p.user_id === r.user_id)) {
              participantsStore.push({ conversation_id: r.conversation_id, user_id: r.user_id });
            }
          }
        }
        if (op === "insert" && table === "messages") {
          messagesStore.push({
            id: `msg-${messagesStore.length + 1}`,
            created_at: new Date().toISOString(),
            is_system_message: false,
            ...payload,
          });
        }
        // select-list await (e.g. profiles .in().) resolves to filtered rows.
        const data = op === "select" ? selectRows() : null;
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  }
  return {
    from,
    auth: { getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId } : null } }) },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeClient(true) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeClient(false) }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { sendRecruitorMessage, getCandidateConversation } from "./messages";

beforeEach(() => {
  currentUserId = null;
  conversationsStore = [];
  participantsStore = [];
  messagesStore = [];
  profilesStore = {
    [COMPANY_USER]: { id: COMPANY_USER, full_name: "Company Contact", role: "company" },
    [RECRUITER_USER]: { id: RECRUITER_USER, full_name: "Recruiter Rita", role: "recruiter" },
    [ADMIN_USER]: { id: ADMIN_USER, full_name: "Admin Alice", role: "admin" },
  };
  inserts.length = 0;
  convIdSeq = 0;
});

describe("sendRecruitorMessage — privacy routing", () => {
  it("(a) company sender lands in 'recruito_company' with only the company as participant", async () => {
    currentUserId = COMPANY_USER;
    const res = await sendRecruitorMessage(CANDIDATE_ID, JOB_ID, "hi from company");
    expect(res).toEqual({ success: true });

    const conv = conversationsStore.find((c) => c.candidate_id === CANDIDATE_ID);
    expect(conv.conversation_type).toBe("recruito_company");
    const parts = participantsStore.filter((p) => p.conversation_id === conv.id);
    expect(parts.map((p) => p.user_id)).toEqual([COMPANY_USER]);
    expect(parts).toHaveLength(1);
  });

  it("(b) recruiter sender lands in 'recruito_recruiter' with only the recruiter as participant", async () => {
    currentUserId = RECRUITER_USER;
    const res = await sendRecruitorMessage(CANDIDATE_ID, JOB_ID, "hi from recruiter");
    expect(res).toEqual({ success: true });

    const conv = conversationsStore.find((c) => c.candidate_id === CANDIDATE_ID);
    expect(conv.conversation_type).toBe("recruito_recruiter");
    const parts = participantsStore.filter((p) => p.conversation_id === conv.id);
    expect(parts.map((p) => p.user_id)).toEqual([RECRUITER_USER]);
    expect(parts).toHaveLength(1);
  });

  it("rejects a stranger (IDOR guard on send)", async () => {
    currentUserId = STRANGER_USER;
    const res = await sendRecruitorMessage(CANDIDATE_ID, JOB_ID, "i should not be here");
    expect(res.success).toBeUndefined();
    expect(res.error).toBeTruthy();
    expect(conversationsStore).toHaveLength(0);
  });
});

describe("getCandidateConversation — service-role sender resolution + IDOR guard", () => {
  it("(c) resolves the OTHER role's full_name (no Unknown) via service-role profiles", async () => {
    // Company opens its private recruito thread; the message was authored by the recruiter/admin.
    const conv = { id: "conv-x", candidate_id: CANDIDATE_ID, job_id: JOB_ID, conversation_type: "recruito_company", created_at: new Date().toISOString() };
    conversationsStore.push(conv);
    participantsStore.push({ conversation_id: conv.id, user_id: COMPANY_USER });
    messagesStore.push({ id: "m1", conversation_id: conv.id, sender_id: ADMIN_USER, content: "reply from admin", created_at: new Date().toISOString(), is_system_message: false });

    currentUserId = COMPANY_USER;
    const result = await getCandidateConversation(CANDIDATE_ID, "recruito_company");
    expect(result).not.toBeNull();
    const msg = (result as any).messages.find((m: any) => m.id === "m1");
    expect(msg.sender?.full_name).toBe("Admin Alice");
    expect(msg.sender?.full_name).not.toBe("");
  });

  it("(d) returns null for a user who is neither a participant nor an admin", async () => {
    const conv = { id: "conv-y", candidate_id: CANDIDATE_ID, job_id: JOB_ID, conversation_type: "recruito_company", created_at: new Date().toISOString() };
    conversationsStore.push(conv);
    participantsStore.push({ conversation_id: conv.id, user_id: COMPANY_USER });
    messagesStore.push({ id: "m1", conversation_id: conv.id, sender_id: COMPANY_USER, content: "secret", created_at: new Date().toISOString(), is_system_message: false });
    profilesStore[STRANGER_USER] = { id: STRANGER_USER, full_name: "Nosy", role: "recruiter" };

    currentUserId = STRANGER_USER;
    const result = await getCandidateConversation(CANDIDATE_ID, "recruito_company");
    expect(result).toBeNull();
  });

  it("allows an admin to read any thread", async () => {
    const conv = { id: "conv-z", candidate_id: CANDIDATE_ID, job_id: JOB_ID, conversation_type: "recruito_recruiter", created_at: new Date().toISOString() };
    conversationsStore.push(conv);
    participantsStore.push({ conversation_id: conv.id, user_id: RECRUITER_USER });
    messagesStore.push({ id: "m1", conversation_id: conv.id, sender_id: RECRUITER_USER, content: "rec note", created_at: new Date().toISOString(), is_system_message: false });

    currentUserId = ADMIN_USER;
    const result = await getCandidateConversation(CANDIDATE_ID, "recruito_recruiter");
    expect(result).not.toBeNull();
    expect((result as any).messages[0].sender?.full_name).toBe("Recruiter Rita");
  });
});
