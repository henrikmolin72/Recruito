#!/usr/bin/env python3
"""
check_dod.py — the eval-gated Definition of Done (AGENTIC-SDLC-SPEC §4, §8 P0).

Blocks a "done" claim unless the evidence exists. It composes the verification
artifacts into one ship decision:

  1. tests   — a test command exits 0
  2. eval    — an eval-harness report.json shows overall_pass == true
  3. trace   — agent-trace shows a run was recorded (observability captured)
  4. review  — an explicit human-review attestation (--reviewed)

Fail-closed: a *required* item with no evidence FAILS (missing evidence is not a
pass). This is the point — "set the bar at the eval, not the demo." Usable two ways:
called by the verifier before claiming completion, or as a git pre-commit / Claude
Code pre-"done" hook (see references/dod-gate.md).

Usage:
  python check_dod.py \
    --tests "npm --prefix app run test" \
    --eval-report eval-runs/ci/report.json \
    --trace .claude/traces/runs.jsonl --trace-since 2026-06-19T00:00:00 \
    --reviewed

  python check_dod.py --require eval,review --eval-report r.json --reviewed
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

ALL_ITEMS = ["tests", "eval", "trace", "review"]


def check_tests(cmd):
    if not cmd:
        return None, "no --tests command given"
    cp = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=3600)
    ok = cp.returncode == 0
    return ok, (f"exit {cp.returncode}" + ("" if ok else f": {(cp.stderr or cp.stdout)[-200:].strip()}"))


def check_eval_report(report):
    if not report:
        return None, "no --eval-report given"
    p = Path(report)
    if not p.exists():
        return False, f"report not found: {report}"
    try:
        data = json.loads(p.read_text())
    except Exception as e:
        return False, f"unreadable report: {e}"
    ok = bool(data.get("overall_pass"))
    return ok, f"overall_pass={data.get('overall_pass')} ({len(data.get('cases', []))} cases)"


def check_trace(trace, since):
    if not trace:
        return None, "no --trace given"
    p = Path(trace)
    if not p.exists() or not p.read_text().strip():
        return False, f"no trace at {trace}"
    if since:
        recent = [l for l in p.read_text().splitlines()
                  if l.strip() and json.loads(l).get("ts", "") >= since]
        if not recent:
            return False, f"no trace since {since}"
        return True, f"{len(recent)} trace(s) since {since}"
    return True, "trace present"


def main():
    ap = argparse.ArgumentParser(description="Eval-gated Definition of Done check.")
    ap.add_argument("--tests", help="test command; must exit 0")
    ap.add_argument("--eval-report", help="eval-harness report.json path")
    ap.add_argument("--trace", help="agent-trace JSONL path")
    ap.add_argument("--trace-since", help="ISO lower bound for a recent trace")
    ap.add_argument("--reviewed", action="store_true",
                    help="human-review attestation (absent => review FAILS)")
    ap.add_argument("--require", default=",".join(ALL_ITEMS),
                    help=f"comma list of mandatory items (default: {','.join(ALL_ITEMS)})")
    ap.add_argument("--json", action="store_true", dest="as_json")
    args = ap.parse_args()

    required = {x.strip() for x in args.require.split(",") if x.strip()}
    results = {
        "tests": check_tests(args.tests),
        "eval": check_eval_report(args.eval_report),
        "trace": check_trace(args.trace, args.trace_since),
        "review": (args.reviewed, "attested" if args.reviewed else "NOT attested"),
    }

    gate_ok = True
    rows = []
    for item in ALL_ITEMS:
        ok, detail = results[item]
        mandatory = item in required
        # missing evidence (ok is None) on a required item fails closed
        passed = ok is True
        blocks = mandatory and not passed
        if blocks:
            gate_ok = False
        status = ("PASS" if passed else
                  ("FAIL" if mandatory else "skip" if ok is None else "warn"))
        rows.append((item, status, mandatory, detail))

    if args.as_json:
        print(json.dumps({"gate_pass": gate_ok,
                          "items": {r[0]: r[1] for r in rows}}, indent=2))
    else:
        print("\nDefinition of Done")
        print("=" * 52)
        for item, status, mandatory, detail in rows:
            mark = {"PASS": "✅", "FAIL": "❌", "skip": "·", "warn": "⚠️"}[status]
            req = "required" if mandatory else "optional"
            print(f"  {mark} {item:8} [{req:8}] {detail}")
        print("=" * 52)
        print("GATE: " + ("PASS — ok to claim done ✅" if gate_ok
                          else "FAIL — not done; supply missing evidence ❌"))
    sys.exit(0 if gate_ok else 1)


if __name__ == "__main__":
    main()
