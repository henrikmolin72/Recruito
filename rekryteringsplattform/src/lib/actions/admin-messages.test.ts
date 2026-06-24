import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Unit tests for the admin side of the messaging privacy split (Task 3).
// Migration 060 replaced the single shared 'recruito' thread with two PRIVATE
// per-party threads ('recruito_company', 'recruito_recruiter'). These tests
// prove, against a mocked Supabase service-role client + mocked requireAdmin:
//   (a) getRecruitoConversationsForAdmin returns SEPARATE company and recruiter
//       rows for a candidate that has both threads, each with the right party.
//   (b) sendAdminMessage targets the correct conversation_type, seeds/uses the
//       correct single party as participant, and notifies ONLY that party.
// (The repo has no DB-integration harness; full wiring is Task 5 e2e.)
// ---------------------------------------------------------------------------

const COMPANY_USER = "company-user-1";
const RECRUITER_USER = "recruiter-user-1";
const ADMIN_USER = "admin-user-1";
const CANDIDATE_ID = "cand-1";
const JOB_ID = "job-1";
const MANDATE_ID = "mand-1";

// candidate→recruiter/company resolution fixture (shape mirrors the nested join
// the actions request). recruiter name resolves via profiles!recruiters_user_id_fkey.
const candidateRow: any = {
  mandate_id: MANDATE_ID,
  recruiter: { user_id: RECRUITER_USER, profile: { full_name: "Recruiter Rita" } },
  job: { id: JOB_ID, company: { user_id: COMPANY_USER, company_name: "Acme Inc" } },
  first_name: "Cara",
  last_name: "Candidate",
  current_title: "Engineer",
  status: "active",
};

let conversationsStore: any[] = [];
let participantsStore: Array<{ conversation_id: string; user_id: string }> = [];
let messagesStore: any[] = [];
const inserts: Array<{ table: string; payload: any }> = [];
const notifications: Array<{ userId: string; opts: any }> = [];
let convIdSeq = 0;

function makeClient() {
  function from(table: string) {
    const filters: Record<string, any> = {};
    let op: "select" | "insert" | "upsert" = "select";
    let payload: any = null;

    const applyFilters = (rows: any[]) =>
      rows.filter((r) =>
        Object.entries(filters).every(([k, v]) => {
          if (k === "__in_conversation_type") return v.includes(r.conversation_type);
          return r[k] === v;
        }),
      );

    const selectRows = (): any[] => {
      if (table === "candidates") return [candidateRow];
      if (table === "conversations") return applyFilters(conversationsStore);
      if (table === "conversation_participants") return applyFilters(participantsStore);
      if (table === "messages") return applyFilters(messagesStore);
      return [];
    };

    const chain: any = {
      select: () => chain,
      eq: (col: string, val: any) => { filters[col] = val; return chain; },
      in: (col: string, vals: any[]) => {
        if (col === "conversation_type") filters.__in_conversation_type = vals;
        else filters[col] = vals;
        return chain;
      },
      order: () => chain,
      insert: (p: any) => { op = "insert"; payload = p; inserts.push({ table, payload: p }); return chain; },
      upsert: (p: any) => { op = "upsert"; payload = p; inserts.push({ table, payload: p }); return chain; },
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
          const rows = Array.isArray(payload) ? payload : [payload];
          for (const r of rows) {
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
        const data = op === "select" ? selectRows() : null;
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  }
  return { from };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeClient() }));
vi.mock("./require-admin", () => ({ requireAdmin: async () => ({ user: { id: ADMIN_USER } }) }));
vi.mock("@/lib/notifications/create", () => ({
  createNotification: vi.fn(async (userId: string, opts: any) => { notifications.push({ userId, opts }); }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getRecruitoConversationsForAdmin, sendAdminMessage } from "./admin-messages";

beforeEach(() => {
  conversationsStore = [];
  participantsStore = [];
  messagesStore = [];
  inserts.length = 0;
  notifications.length = 0;
  convIdSeq = 0;
});

describe("getRecruitoConversationsForAdmin — per-party rows", () => {
  it("(a) returns separate company + recruiter rows for a candidate with both threads", async () => {
    conversationsStore.push(
      { id: "conv-c", candidate_id: CANDIDATE_ID, job_id: JOB_ID, conversation_type: "recruito_company", created_at: new Date().toISOString() },
      { id: "conv-r", candidate_id: CANDIDATE_ID, job_id: JOB_ID, conversation_type: "recruito_recruiter", created_at: new Date().toISOString() },
    );
    // attach a candidate join + messages onto each conv (mock candidates returns candidateRow)
    conversationsStore.forEach((c) => {
      c.candidate = candidateRow;
      c.messages = [{ content: `hi ${c.conversation_type}`, created_at: new Date().toISOString() }];
    });

    const rows = await getRecruitoConversationsForAdmin();
    expect(rows).toHaveLength(2);
    const company = rows.find((r) => r.party === "company");
    const recruiter = rows.find((r) => r.party === "recruiter");
    expect(company?.conversationType).toBe("recruito_company");
    expect(company?.partyName).toBe("Acme Inc");
    expect(recruiter?.conversationType).toBe("recruito_recruiter");
    expect(recruiter?.partyName).toBe("Recruiter Rita");
  });

  it("returns a single row for a candidate with only one party thread", async () => {
    conversationsStore.push(
      { id: "conv-c", candidate_id: CANDIDATE_ID, job_id: JOB_ID, conversation_type: "recruito_company", created_at: new Date().toISOString() },
    );
    conversationsStore.forEach((c) => {
      c.candidate = candidateRow;
      c.messages = [{ content: `hi ${c.conversation_type}`, created_at: new Date().toISOString() }];
    });

    const rows = await getRecruitoConversationsForAdmin();
    expect(rows).toHaveLength(1);
    expect(rows[0].party).toBe("company");
    expect(rows[0].conversationType).toBe("recruito_company");
    expect(rows[0].partyName).toBe("Acme Inc");
  });
});

describe("sendAdminMessage — targets correct party thread + single notify", () => {
  it("(b) company target: seeds only the company user, notifies only the company", async () => {
    const res = await sendAdminMessage(CANDIDATE_ID, JOB_ID, "reply to company", "recruito_company");
    expect(res).toEqual({ success: true });

    const conv = conversationsStore.find((c) => c.candidate_id === CANDIDATE_ID);
    expect(conv.conversation_type).toBe("recruito_company");
    const parts = participantsStore.filter((p) => p.conversation_id === conv.id);
    expect(parts.map((p) => p.user_id)).toEqual([COMPANY_USER]);

    const msg = messagesStore.find((m) => m.conversation_id === conv.id);
    expect(msg.sender_id).toBe(ADMIN_USER);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(COMPANY_USER);
  });

  it("recruiter target: seeds only the recruiter user, notifies only the recruiter", async () => {
    const res = await sendAdminMessage(CANDIDATE_ID, JOB_ID, "reply to recruiter", "recruito_recruiter");
    expect(res).toEqual({ success: true });

    const conv = conversationsStore.find((c) => c.candidate_id === CANDIDATE_ID);
    expect(conv.conversation_type).toBe("recruito_recruiter");
    const parts = participantsStore.filter((p) => p.conversation_id === conv.id);
    expect(parts.map((p) => p.user_id)).toEqual([RECRUITER_USER]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(RECRUITER_USER);
  });

  it("reuses an existing party thread instead of creating a second one", async () => {
    // Pre-seed the company thread + its participant (as if a prior message created it).
    conversationsStore.push({
      id: "conv-existing",
      candidate_id: CANDIDATE_ID,
      job_id: JOB_ID,
      conversation_type: "recruito_company",
      created_at: new Date().toISOString(),
    });
    participantsStore.push({ conversation_id: "conv-existing", user_id: COMPANY_USER });

    const res = await sendAdminMessage(CANDIDATE_ID, JOB_ID, "second reply", "recruito_company");
    expect(res).toEqual({ success: true });

    // No new conversation created (the `if (!conv)` branch was skipped).
    const convs = conversationsStore.filter((c) => c.candidate_id === CANDIDATE_ID && c.conversation_type === "recruito_company");
    expect(convs).toHaveLength(1);
    expect(inserts.some((i) => i.table === "conversations")).toBe(false);

    // No participant re-seed; still exactly the one pre-seeded participant.
    expect(inserts.some((i) => i.table === "conversation_participants")).toBe(false);
    const parts = participantsStore.filter((p) => p.conversation_id === "conv-existing");
    expect(parts.map((p) => p.user_id)).toEqual([COMPANY_USER]);

    // Message landed in the existing thread; party notified.
    const msg = messagesStore.find((m) => m.conversation_id === "conv-existing");
    expect(msg.content).toBe("second reply");
    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(COMPANY_USER);
  });

  it("returns a generic error and writes nothing when the target party has no user_id", async () => {
    // Company row with null user_id → partyUserId unresolved.
    const orig = candidateRow.job;
    candidateRow.job = { id: JOB_ID, company: { user_id: null, company_name: "Acme Inc" } };
    try {
      const res = await sendAdminMessage(CANDIDATE_ID, JOB_ID, "reply to nobody", "recruito_company");
      expect(res.success).toBeUndefined();
      expect(typeof res.error).toBe("string");

      // Nothing was written: no conversation, no message, no notification.
      expect(inserts.some((i) => i.table === "conversations")).toBe(false);
      expect(inserts.some((i) => i.table === "messages")).toBe(false);
      expect(conversationsStore).toHaveLength(0);
      expect(messagesStore).toHaveLength(0);
      expect(notifications).toHaveLength(0);
    } finally {
      candidateRow.job = orig;
    }
  });
});
