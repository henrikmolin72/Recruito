// Emits the exact filled prompt + CV payload for each deal-breaker case to disk,
// so an LLM can run the real production prompt verbatim (no API key needed for
// the emit step). Pairs with scripts/screening-dealbreaker-eval.ts fixtures.
import { writeFileSync } from "fs";
import { fillEvaluationPrompt } from "../src/lib/screening/evaluation-prompt";
import { JD_TEXT, CASES } from "./screening-dealbreaker-eval";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: tsx scripts/emit-eval-payloads.ts <outDir>");
  process.exit(2);
}

const prompt = fillEvaluationPrompt({
  jdText: JD_TEXT,
  config: { targetSector: "Software", adjacentSectors: null, transferableSkills: null, customKeywords: null },
  metadata: { screeningId: "eval", modelVersion: "eval", isoTimestamp: "2026-07-03T00:00:00Z", jdId: "eval-jd", cvHash: "eval" },
});

CASES.forEach((c, i) => {
  const payload = `${prompt}\n\n══════════════════════════════════════════════════════════════════\nCANDIDATE MATERIALS (reviewed against the JD above)\n══════════════════════════════════════════════════════════════════\n\nCV:\n${c.cv}\n\nSCREENING QUESTIONS & ANSWERS:\n(no screening questions for this role)`;
  const path = `${outDir}/case-${i}.txt`;
  writeFileSync(path, payload);
  console.log(`${path}\t${c.name}\texpectCapped=${c.expectCapped}`);
});
