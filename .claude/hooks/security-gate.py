#!/usr/bin/env python3
import sys, json, re
try:
    d = json.load(sys.stdin)
    fp = d.get('tool_input', {}).get('file_path', '')
    if re.search(r'/actions/[^/]+\.ts$', fp):
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "SECURITY GATE: (1) auth check present? requireAdmin() or supabase.auth.getUser()+role (2) IDOR: ownership validated before mutation? (3) no raw Supabase/Postgres errors returned to client?"}}))
except Exception:
    pass
