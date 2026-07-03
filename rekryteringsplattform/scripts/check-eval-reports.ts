// Scores screening reports produced for the deal-breaker cases through the REAL
// extraction + tier mapping, and checks each against its expectation. Reads
// <dir>/case-<i>.report.md for each fixture in CASES.
//   tsx scripts/check-eval-reports.ts <dir>
import { readFileSync } from "fs";
import { CASES } from "./screening-dealbreaker-eval";
import { extractMatchScore } from "../src/lib/screening/extract-match-score";
import { getMatchLevel, CLIENT_MATCH_THRESHOLD } from "../src/lib/screening/match-level";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: tsx scripts/check-eval-reports.ts <dir>");
  process.exit(2);
}

console.log(`threshold: <${CLIENT_MATCH_THRESHOLD} = Not Recommended | deal-breaker cap = ≤49\n`);
let failures = 0;
CASES.forEach((c, i) => {
  let md = "";
  try {
    md = readFileSync(`${dir}/case-${i}.report.md`, "utf8");
  } catch {
    console.log(`⚠️  case-${i} (${c.name}): no report file`);
    failures++;
    return;
  }
  const score = extractMatchScore(md);
  const tier = getMatchLevel(score).tier;
  const capped = score !== null && score <= 49;
  const notRec = tier === "notRecommended";
  const ok = c.expectCapped ? capped && notRec : !capped && !notRec;
  if (!ok) failures++;
  console.log(
    `${ok ? "✅" : "❌"} ${c.name}\n   score=${score} tier=${tier} (expected ${c.expectCapped ? "≤49 / notRecommended" : "not capped / client-visible"})`
  );
});
console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
