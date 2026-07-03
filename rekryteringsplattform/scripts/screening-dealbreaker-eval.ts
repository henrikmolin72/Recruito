// Live eval: does the updated screening prompt actually cap deal-breaker
// candidates at <75 ("Not Recommended")? Exercises the REAL code path
// (fillEvaluationPrompt + extractMatchScore + getMatchLevel) against the model,
// so it verifies model BEHAVIOUR, not just static mapping.
//
// Run:  ANTHROPIC_API_KEY=sk-... npx tsx scripts/screening-dealbreaker-eval.ts
//   or: dotenv -e .env.local -- npx tsx scripts/screening-dealbreaker-eval.ts
//
// Costs a few Anthropic calls. NOT part of `vitest run` (needs a key + spends
// money). temperature:0 mirrors run-evaluation.ts for reproducibility.
import Anthropic from "@anthropic-ai/sdk";
import { fillEvaluationPrompt } from "../src/lib/screening/evaluation-prompt";
import { extractMatchScore } from "../src/lib/screening/extract-match-score";
import { getMatchLevel, CLIENT_MATCH_THRESHOLD } from "../src/lib/screening/match-level";

const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// A JD that marks all three client deal-breakers as mandatory.
export const JD_TEXT = [
  "Title: Senior Backend Engineer",
  "We are hiring a Senior Backend Engineer for our payments team.",
  "Requirements:",
  "- Minimum 5 years of professional backend software engineering experience (REQUIRED).",
  "- Master's degree in Computer Science or a directly related field (REQUIRED).",
  "- Fluent (C1) or native English, written and spoken (MANDATORY).",
  "- Experience with distributed systems and PostgreSQL.",
].join("\n");

// Each candidate fails exactly ONE deal-breaker; PASS fails none.
export type Case = { name: string; expectCapped: boolean; cv: string };
export const CASES: Case[] = [
  {
    name: "FAIL_EXPERIENCE (only 2 yrs)",
    expectCapped: true,
    cv: [
      "Jordan Lee — Backend Engineer",
      "EXPERIENCE",
      "Backend Engineer, PayFlow AB — 2024-01 to present (full-time). Node.js, PostgreSQL, distributed queues.",
      "Junior Backend Engineer, DataCorp — 2023-01 to 2024-01 (full-time).",
      "EDUCATION",
      "M.Sc. Computer Science, KTH, 2022.",
      "LANGUAGES",
      "English — native. Swedish — fluent.",
    ].join("\n"),
  },
  {
    name: "FAIL_DEGREE_FIELD (Master's in Marketing)",
    expectCapped: true,
    cv: [
      "Sam Rivera — Backend Engineer",
      "EXPERIENCE",
      "Senior Backend Engineer, ScaleWorks — 2016 to present (9 yrs, full-time). Java, PostgreSQL, microservices.",
      "EDUCATION",
      "M.Sc. Marketing, Stockholm School of Economics, 2015.",
      "LANGUAGES",
      "English — native.",
    ].join("\n"),
  },
  {
    name: "FAIL_LANGUAGE (basic English)",
    expectCapped: true,
    cv: [
      "Alex Kim — Backend Engineer",
      "EXPERIENCE",
      "Senior Backend Engineer, NordDev — 2015 to present (10 yrs, full-time). Go, PostgreSQL, Kafka.",
      "EDUCATION",
      "M.Sc. Computer Science, Chalmers, 2014.",
      "LANGUAGES",
      "English — basic (A2). Korean — native.",
    ].join("\n"),
  },
  {
    name: "PASS_CONTROL (meets all)",
    expectCapped: false,
    cv: [
      "Robin Park — Senior Backend Engineer",
      "EXPERIENCE",
      "Senior Backend Engineer, FinScale — 2017 to present (8 yrs, full-time). Distributed systems, PostgreSQL, Go.",
      "Backend Engineer, CloudBank — 2015 to 2017 (full-time).",
      "EDUCATION",
      "M.Sc. Computer Science, KTH, 2015.",
      "LANGUAGES",
      "English — native. Spanish — fluent.",
    ].join("\n"),
  },
];

async function scoreCase(anthropic: Anthropic, c: Case): Promise<number | null> {
  const prompt = fillEvaluationPrompt({
    jdText: JD_TEXT,
    config: { targetSector: "Software", adjacentSectors: null, transferableSkills: null, customKeywords: null },
    metadata: { screeningId: "eval", modelVersion: model, isoTimestamp: "2026-07-03T00:00:00Z", jdId: "eval-jd", cvHash: "eval" },
  });
  const res = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${prompt}\n\n══════════════════════════════════════════════════════════════════\nCANDIDATE MATERIALS (reviewed against the JD above)\n══════════════════════════════════════════════════════════════════\n\nCV:\n${c.cv}\n\nSCREENING QUESTIONS & ANSWERS:\n(no screening questions for this role)`,
          },
        ],
      },
    ],
  });
  const md = res.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("").trim();
  return extractMatchScore(md);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set — cannot run the live eval.");
    process.exit(2);
  }
  const anthropic = new Anthropic({ apiKey });
  console.log(`Model: ${model}  |  threshold: <${CLIENT_MATCH_THRESHOLD} = Not Recommended\n`);
  let failures = 0;
  for (const c of CASES) {
    const score = await scoreCase(anthropic, c);
    const tier = getMatchLevel(score).tier;
    const capped = score !== null && score <= 49;
    const notRecommended = tier === "notRecommended";
    // A deal-breaker case must be capped (<=49) AND land in the Not Recommended tier.
    // The control must NOT be capped (proves the cap is selective, not a blanket floor).
    const ok = c.expectCapped ? capped && notRecommended : !capped;
    if (!ok) failures++;
    console.log(
      `${ok ? "✅" : "❌"} ${c.name}\n   score=${score} tier=${tier} (expected ${c.expectCapped ? "≤49 / notRecommended" : "not capped"})`
    );
  }
  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

// Only run when invoked directly (so scripts/emit-eval-payloads.ts can import
// JD_TEXT / CASES without triggering the live eval).
if (process.argv[1] && process.argv[1].endsWith("screening-dealbreaker-eval.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
