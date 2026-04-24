#!/usr/bin/env python3
import sys, json
try:
    d = json.load(sys.stdin)
    fp = d.get('tool_input', {}).get('file_path', '')
    if '/i18n/dictionaries/' in fp:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "i18n GATE: ensure ALL dictionaries in src/i18n/dictionaries/ have this key — missing keys break the build (commit 8df1e7a)."}}))
except Exception:
    pass
