#!/usr/bin/env python3
"""
trace.py — minimal agent-run observability (the "trace" half of AGENTIC-SDLC §8 P0).

Without observability there is no way to tell whether an agent is doing well or
quietly drifting (SPEC §2). This records each agent run as a structured JSONL line
and summarizes the log — counts, tokens, latency, failures, and drift flags. It is
deliberately tiny and stdlib-only; for richer tracing the SPEC points at the ruflo
trace tools, but this is the portable floor every repo can have today.

Log location defaults to `.claude/traces/runs.jsonl` (override with --log).

Subcommands:
  record     append one run to the trace log; prints the run id
  summarize  aggregate the log into a console + optional markdown report
  assert     exit 0 if a matching/recent trace exists, else 1 (used by the DoD gate)

Examples:
  python trace.py record --task "impl auth" --model opus --tokens-in 1200 \\
      --tokens-out 800 --duration-ms 41000 --tools 9 --outcome pass
  python trace.py summarize --md traces/summary.md
  python trace.py assert --since 2026-06-19T00:00:00   # any run today?
"""

import argparse
import json
import statistics
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

DEFAULT_LOG = ".claude/traces/runs.jsonl"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_runs(log: Path, since: str | None = None) -> list[dict]:
    if not log.exists():
        return []
    runs = []
    for line in log.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if since and r.get("ts", "") < since:
            continue
        runs.append(r)
    return runs


def cmd_record(a):
    log = Path(a.log)
    log.parent.mkdir(parents=True, exist_ok=True)
    rid = a.id or f"run-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')}"
    entry = {
        "id": rid, "ts": now_iso(), "task": a.task, "model": a.model,
        "tokens_in": a.tokens_in, "tokens_out": a.tokens_out,
        "tokens_total": (a.tokens_in or 0) + (a.tokens_out or 0),
        "duration_ms": a.duration_ms, "tool_calls": a.tools,
        "outcome": a.outcome, "notes": a.notes,
    }
    with log.open("a") as f:
        f.write(json.dumps(entry) + "\n")
    print(rid)


def flag_drift(runs: list[dict]) -> list[str]:
    """Cheap drift heuristics: failures, and runs >3x the median tokens/latency."""
    flags = []
    for key, label in (("tokens_total", "tokens"), ("duration_ms", "latency")):
        vals = [r[key] for r in runs if isinstance(r.get(key), (int, float)) and r[key]]
        if len(vals) >= 4:
            med = statistics.median(vals)
            for r in runs:
                if isinstance(r.get(key), (int, float)) and med and r[key] > 3 * med:
                    flags.append(f"{r.get('id')}: {label} {r[key]} > 3x median ({med:.0f})")
    flags += [f"{r.get('id')}: outcome={r.get('outcome')}" for r in runs
              if r.get("outcome") not in (None, "pass")]
    return flags


def cmd_summarize(a):
    runs = read_runs(Path(a.log), a.since)
    if not runs:
        print("No traces found.")
        return
    durs = [r["duration_ms"] for r in runs if isinstance(r.get("duration_ms"), (int, float))]
    toks = sum(r.get("tokens_total", 0) or 0 for r in runs)
    passed = sum(1 for r in runs if r.get("outcome") == "pass")
    drift = flag_drift(runs)
    by_task = {}
    for r in runs:
        by_task.setdefault(r.get("task", "?"), []).append(r)

    lines = [f"# Agent trace summary",
             f"- runs: **{len(runs)}**  (pass {passed} / fail {len(runs)-passed})",
             f"- total tokens: **{toks:,}**",
             f"- latency ms: avg {statistics.mean(durs):.0f} / max {max(durs)}" if durs else "- latency: n/a",
             f"- drift flags: **{len(drift)}**", ""]
    if drift:
        lines += ["## Drift", *[f"- ⚠️ {d}" for d in drift], ""]
    lines += ["## By task", "| task | runs | pass | tokens |", "|---|---|---|---|"]
    for t, rs in sorted(by_task.items(), key=lambda kv: -len(kv[1])):
        p = sum(1 for r in rs if r.get("outcome") == "pass")
        tk = sum(r.get("tokens_total", 0) or 0 for r in rs)
        lines.append(f"| {t} | {len(rs)} | {p} | {tk:,} |")
    report = "\n".join(lines) + "\n"
    print(report)
    if a.md:
        Path(a.md).parent.mkdir(parents=True, exist_ok=True)
        Path(a.md).write_text(report)
        print(f"(written to {a.md})")


def cmd_assert(a):
    runs = read_runs(Path(a.log), a.since)
    if a.id:
        runs = [r for r in runs if r.get("id") == a.id]
    if runs:
        print(f"OK: {len(runs)} matching trace(s).")
        sys.exit(0)
    print("FAIL: no matching trace found.", file=sys.stderr)
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser(description="Minimal agent-run trace logger.")
    ap.add_argument("--log", default=DEFAULT_LOG, help=f"trace log path (default {DEFAULT_LOG})")
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("record")
    r.add_argument("--task", required=True)
    r.add_argument("--model", default="")
    r.add_argument("--tokens-in", type=int, default=0, dest="tokens_in")
    r.add_argument("--tokens-out", type=int, default=0, dest="tokens_out")
    r.add_argument("--duration-ms", type=int, default=0, dest="duration_ms")
    r.add_argument("--tools", type=int, default=0)
    r.add_argument("--outcome", choices=["pass", "fail"], default="pass")
    r.add_argument("--notes", default="")
    r.add_argument("--id", default="")
    r.set_defaults(func=cmd_record)

    s = sub.add_parser("summarize")
    s.add_argument("--since", default=None, help="ISO timestamp lower bound")
    s.add_argument("--md", default=None, help="also write markdown here")
    s.set_defaults(func=cmd_summarize)

    x = sub.add_parser("assert")
    x.add_argument("--since", default=None)
    x.add_argument("--id", default=None)
    x.set_defaults(func=cmd_assert)

    a = ap.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
