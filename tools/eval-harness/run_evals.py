#!/usr/bin/env python3
"""
run_evals.py — executable eval runner for the eval-harness skill.

Turns an evalset (JSON or YAML) into a scored, gated pass/fail run that CI can
consume. Implements the rubric from AGENTIC-SDLC-SPEC.md §5 / Appendix B:
positive dimensions (task_success, tool_use_quality, trajectory, response_quality)
scored higher-is-better, plus penalties (hallucination) where lower-is-better and
which can hard-fail the gate.

Two grader kinds per case:
  - code_checks : deterministic shell commands. exit 0 = pass. Reliable > probabilistic.
  - judge       : an LM-as-judge call (default `claude -p`) that scores rubric
                  dimensions 0..1 and returns a JSON object.

Design goals: stdlib-only (YAML optional), agent-agnostic (the "agent under test"
is just a command template), and CI-friendly (non-zero exit when the gate fails).

Usage:
  python run_evals.py evalset.json                 # run agent + grade + gate
  python run_evals.py evalset.yaml --n 3           # 3 trials -> pass@k / pass^k
  python run_evals.py evalset.json --no-run        # grade pre-existing outputs only
  python run_evals.py evalset.json --out runs/foo  # where to write outputs+report
  python run_evals.py evalset.json --no-judge      # code checks only (no LM judge)

Exit code: 0 if every case passes the gate, 1 otherwise (use directly in CI).
"""

import argparse
import json
import os
import re
import shlex
import statistics
import subprocess
import sys
from pathlib import Path

DEFAULT_DIMENSIONS = {            # positive: higher is better
    "task_success": 0.4,
    "tool_use_quality": 0.2,
    "trajectory": 0.2,
    "response_quality": 0.1,
}
DEFAULT_PENALTIES = {             # lower is better; subtracted and gate-checked
    "hallucination": 0.1,
}
DEFAULT_GATE = {"min_weighted_score": 0.8, "max_penalty": {"hallucination": 0.0}}
DEFAULT_AGENT_CMD = 'claude -p {prompt}'
DEFAULT_JUDGE_CMD = 'claude -p {judge_prompt}'


# --------------------------------------------------------------------------- io
def load_evalset(path: Path) -> dict:
    text = path.read_text()
    if path.suffix in (".yaml", ".yml"):
        try:
            import yaml  # optional
        except ImportError:
            sys.exit("YAML evalset given but PyYAML not installed. "
                     "`pip install pyyaml` or use a .json evalset.")
        return yaml.safe_load(text)
    return json.loads(text)


def run_cmd(template: str, **kw) -> subprocess.CompletedProcess:
    """Render a {placeholder} command template and run it via the shell."""
    cmd = template
    for k, v in kw.items():
        cmd = cmd.replace("{" + k + "}", shlex.quote(str(v)))
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=1800)


# ---------------------------------------------------------------------- judging
JUDGE_INSTRUCTIONS = """\
You are an impartial evaluation judge. Score the AGENT OUTPUT below against the
rubric. Return ONLY a fenced ```json block, no prose. Each dimension is 0.0–1.0.
For "positive" dimensions higher = better. For "penalty" dimensions (e.g.
hallucination) higher = WORSE (0.0 = clean, 1.0 = severe).

RUBRIC (case-specific guidance):
{rubric}

DIMENSIONS TO SCORE (positive): {positive}
PENALTY DIMENSIONS TO SCORE: {penalties}

TASK GIVEN TO THE AGENT:
{prompt}

AGENT OUTPUT / TRANSCRIPT:
{output}

Respond as:
```json
{{"task_success": 0.0, "...": 0.0, "reasoning": "one sentence per dimension"}}
```
"""


def parse_judge_json(text: str) -> dict:
    m = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    blob = m[-1] if m else None
    if not blob:                      # fallback: last bare {...}
        m2 = re.findall(r"(\{.*\})", text, re.DOTALL)
        blob = m2[-1] if m2 else None
    if not blob:
        raise ValueError("no JSON object found in judge response")
    return json.loads(blob)


def judge_case(case, output, positive, penalties, judge_cmd):
    prompt = JUDGE_INSTRUCTIONS.format(
        rubric=case.get("judge_rubric", "Use general software-quality judgement."),
        positive=", ".join(positive),
        penalties=", ".join(penalties) or "(none)",
        prompt=case.get("prompt", ""),
        output=output[:20000],
    )
    res = run_cmd(judge_cmd, judge_prompt=prompt)
    try:
        return parse_judge_json(res.stdout)
    except Exception as e:                      # judge failure is itself a signal
        return {"_judge_error": f"{e}: {res.stdout[:300]}{res.stderr[:300]}"}


# ----------------------------------------------------------------------- scoring
def score_trial(case, output, cfg, run_judge):
    dims = {**cfg["dimensions"]}
    pens = {**cfg["penalties"]}
    scores, notes = {}, {}

    # code_checks: deterministic, grouped by the dimension they attest to.
    by_dim = {}
    for chk in case.get("code_checks", []):
        cp = run_cmd(chk["cmd"]) if "{" not in chk["cmd"] else run_cmd(chk["cmd"], workdir=case.get("workdir", "."))
        passed = cp.returncode == 0
        by_dim.setdefault(chk.get("dimension", "task_success"), []).append(passed)
        notes.setdefault("code_checks", []).append(
            {"name": chk.get("name", chk["cmd"]), "passed": passed,
             "evidence": (cp.stdout or cp.stderr)[-300:].strip()})
    for d, results in by_dim.items():
        scores[d] = sum(results) / len(results)

    # judge for any dimension not already pinned by code_checks
    need_judge = [d for d in {**dims, **pens} if d not in scores]
    if run_judge and need_judge:
        j = judge_case(case, output,
                       [d for d in dims if d not in scores],
                       [d for d in pens if d not in scores], cfg["judge_cmd"])
        notes["judge"] = j
        for d in need_judge:
            if isinstance(j.get(d), (int, float)):
                scores[d] = float(j[d])

    # unjudged/unmeasured positive dims default to 0; penalties default to 0
    weighted = sum(dims[d] * scores.get(d, 0.0) for d in dims)
    weighted -= sum(pens[d] * scores.get(d, 0.0) for d in pens)
    weighted = max(0.0, min(1.0, weighted))

    gate = cfg["gate"]
    ok = weighted >= gate.get("min_weighted_score", 0.8)
    for d, cap in gate.get("max_penalty", {}).items():
        if scores.get(d, 0.0) > cap:
            ok = False
    return {"weighted_score": round(weighted, 4), "passed": ok,
            "dimension_scores": {k: round(v, 4) for k, v in scores.items()},
            "notes": notes}


# -------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Run a scored, gated evalset.")
    ap.add_argument("evalset")
    ap.add_argument("--n", type=int, default=1, help="trials per case (pass@k / pass^k)")
    ap.add_argument("--no-run", action="store_true", help="grade existing outputs, don't invoke the agent")
    ap.add_argument("--no-judge", action="store_true", help="code checks only")
    ap.add_argument("--out", default="eval-runs/latest", help="output directory")
    args = ap.parse_args()

    es = load_evalset(Path(args.evalset))
    cfg = {
        "dimensions": es.get("dimensions", DEFAULT_DIMENSIONS),
        "penalties": es.get("penalties", DEFAULT_PENALTIES),
        "gate": es.get("gate", DEFAULT_GATE),
        "judge_cmd": (es.get("judge") or {}).get("command", DEFAULT_JUDGE_CMD),
    }
    agent_cmd = (es.get("agent_under_test") or {}).get("command", DEFAULT_AGENT_CMD)
    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)

    results = []
    for case in es["cases"]:
        cid = case.get("id", case.get("name", "case"))
        trials = []
        for t in range(args.n):
            cdir = outdir / f"case-{cid}" / f"trial-{t}"
            cdir.mkdir(parents=True, exist_ok=True)
            out_file = cdir / "output.txt"
            if args.no_run:
                output = out_file.read_text() if out_file.exists() else ""
            else:
                cp = run_cmd(agent_cmd, prompt=case["prompt"], workdir=case.get("workdir", "."))
                output = cp.stdout + ("\n[STDERR]\n" + cp.stderr if cp.stderr else "")
                out_file.write_text(output)
            res = score_trial(case, output, cfg, run_judge=not args.no_judge)
            (cdir / "grading.json").write_text(json.dumps(res, indent=2))
            trials.append(res)

        passes = [t["passed"] for t in trials]
        results.append({
            "id": cid, "name": case.get("name", str(cid)),
            "pass_at_1": passes[0],
            "pass_at_k": any(passes),
            "pass_caret_k": all(passes),
            "mean_score": round(statistics.mean(t["weighted_score"] for t in trials), 4),
            "trials": trials,
        })

    overall = all(r["pass_caret_k"] if args.n > 1 else r["pass_at_1"] for r in results)
    report = {"evalset": es.get("name", args.evalset), "n": args.n,
              "gate": cfg["gate"], "overall_pass": overall, "cases": results}
    (outdir / "report.json").write_text(json.dumps(report, indent=2))
    write_markdown(outdir / "report.md", report)

    # human-readable console summary
    print(f"\nEVAL REPORT: {report['evalset']}  (n={args.n})")
    print("=" * 52)
    for r in results:
        tag = "PASS" if (r["pass_caret_k"] if args.n > 1 else r["pass_at_1"]) else "FAIL"
        print(f"  [{tag}] {r['name']:32} score={r['mean_score']:.2f} "
              f"pass@k={r['pass_at_k']} pass^k={r['pass_caret_k']}")
    print("=" * 52)
    print(f"GATE: {'PASS — ship' if overall else 'FAIL — do not ship'}   "
          f"(report: {outdir/'report.md'})")
    sys.exit(0 if overall else 1)


def write_markdown(path: Path, report: dict):
    lines = [f"# Eval report: {report['evalset']}", "",
             f"- trials per case (n): **{report['n']}**",
             f"- gate: `{json.dumps(report['gate'])}`",
             f"- overall: **{'PASS ✅' if report['overall_pass'] else 'FAIL ❌'}**", "",
             "| case | mean score | pass@1 | pass@k | pass^k |",
             "|---|---|---|---|---|"]
    for r in report["cases"]:
        lines.append(f"| {r['name']} | {r['mean_score']:.2f} | "
                     f"{'✅' if r['pass_at_1'] else '❌'} | "
                     f"{'✅' if r['pass_at_k'] else '❌'} | "
                     f"{'✅' if r['pass_caret_k'] else '❌'} |")
    path.write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
