#!/usr/bin/env python3
"""PostToolUse(Bash) hook — the error-iteration loop.

If a verification command (build/test/lint/typecheck) FAILED, inject a
short 'stop and fix before proceeding' reminder. Non-blocking nudge:
Claude already sees the error; this enforces the discipline of not
barrelling past a red build. Conservative matching to avoid noise.
"""
import sys, json, re

try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = (d.get("tool_input", {}) or {}).get("command", "") or ""
resp = d.get("tool_response", "")
out = resp if isinstance(resp, str) else json.dumps(resp)

# Only verification commands matter here.
VERIFY = re.compile(r"\b(npm run (build|lint|test)|next build|tsc\b|vitest|jest|playwright|pytest|eslint)\b")
if not VERIFY.search(cmd):
    sys.exit(0)

# Strong, specific failure signals (avoid false positives).
FAIL = re.compile(
    r"(Failed to compile|error TS\d+|Build error occurred|ELIFECYCLE|npm error|"
    r"Type error:|Command failed|exit code [1-9]|\bFAIL\b|\d+ (failing|failed))",
    re.IGNORECASE,
)
if not FAIL.search(out):
    sys.exit(0)

msg = (
    "⛔ Verification command FAILED. Error-iteration loop: read the error, fix the root cause, "
    "and re-run the SAME command until green BEFORE any new work. Do not declare done on a red build "
    "(see production-ready gate)."
)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": msg}}))
sys.exit(0)
